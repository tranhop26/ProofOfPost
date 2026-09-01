import { describe, expect, it } from "vitest";
import { parseGenToWei, recoveryAction, writeAndConfirm, type ContractClient } from "./contract";
import type { Campaign } from "@proofofpost/shared";

function client(receipt: unknown): ContractClient {
  return {
    writeContract: async () => "0xabc",
    waitForTransactionReceipt: async () => receipt
  };
}

describe("writeAndConfirm", () => {
  it("recognizes the snake-case FINALIZED and consensus execution fields returned by Studionet", async () => {
    const result = await writeAndConfirm(
      client({
        hash: "0xabc",
        status: 7,
        status_name: "FINALIZED",
        result: 6,
        result_name: "MAJORITY_AGREE",
        consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] }
      }),
      { address: "0x1111111111111111111111111111111111111111", functionName: "accept_campaign", args: [1] },
      async () => ({ state: "ACCEPTED" }),
      (value) => value.state === "ACCEPTED",
      { readbackIntervalMs: 0 }
    );

    expect(result).toEqual({ hash: "0xabc", finalized: true, execution: "SUCCESS", readback: { state: "ACCEPTED" } });
  });

  it("returns success only after finalization, execution success, and matching readback", async () => {
    let reads = 0;
    const stages: string[] = [];
    const result = await writeAndConfirm(
      client({ statusName: "FINALIZED", data: { execution_result: "SUCCESS" } }),
      { address: "0x1111111111111111111111111111111111111111", functionName: "accept_campaign", args: [1] },
      async () => ({ state: ++reads === 1 ? "OPEN" : "ACCEPTED" }),
      (value) => value.state === "ACCEPTED",
      { readbackRetries: 2, readbackIntervalMs: 0, onStage: (stage) => stages.push(stage) }
    );
    expect(result).toEqual({ hash: "0xabc", finalized: true, execution: "SUCCESS", readback: { state: "ACCEPTED" } });
    expect(stages).toEqual(["SIGNING", "PENDING", "FINALIZED", "SUCCESS", "READBACK"]);
  });

  it("rejects a finalized transaction whose execution failed", async () => {
    await expect(writeAndConfirm(
      client({ statusName: "FINALIZED", data: { execution_result: "ERROR" } }),
      { address: "0x1111111111111111111111111111111111111111", functionName: "accept_campaign", args: [1] },
      async () => ({ state: "OPEN" }),
      () => true
    )).rejects.toThrow(/execution/i);
  });

  it("preserves the submitted hash when a finalized Studionet transaction is rejected by the contract", async () => {
    let failure: unknown;
    try {
      await writeAndConfirm(
        client({
          hash: "0xabc",
          status: 7,
          status_name: "FINALIZED",
          result: 6,
          result_name: "MAJORITY_AGREE",
          consensus_data: { leader_receipt: [{ execution_result: "ERROR" }] }
        }),
        { address: "0x1111111111111111111111111111111111111111", functionName: "create_campaign", args: [] },
        async () => ({ state: "NONE" }),
        () => false
      );
    } catch (cause) {
      failure = cause;
    }

    expect(failure).toMatchObject({
      hash: "0xabc",
      message: "Transaction finalized but contract execution failed."
    });
  });

  it("rejects stale readback instead of claiming workflow success", async () => {
    await expect(writeAndConfirm(
      client({ statusName: "FINALIZED", data: { execution_result: "SUCCESS" } }),
      { address: "0x1111111111111111111111111111111111111111", functionName: "accept_campaign", args: [1] },
      async () => ({ state: "OPEN" }),
      (value) => value.state === "ACCEPTED",
      { readbackRetries: 2, readbackIntervalMs: 0 }
    )).rejects.toThrow(/readback/i);
  });
});

describe("parseGenToWei", () => {
  it("converts decimal GEN exactly without floating-point rounding", () => {
    expect(parseGenToWei("12.000000000000000001")).toBe(12_000_000_000_000_000_001n);
  });
  it("rejects zero, negative, exponential, and over-precision values", () => {
    for (const value of ["0", "-1", "1e3", "1.0000000000000000001"]) expect(() => parseGenToWei(value)).toThrow();
  });
});

describe("recoveryAction", () => {
  const campaign = {
    state: "OPEN",
    acceptBy: 100,
    submitBy: 200,
    judgmentAttempts: 0,
    lastJudgedAt: 0
  } as Campaign;

  it("exposes only the recovery transition whose deadline has elapsed", () => {
    expect(recoveryAction(campaign, 100)).toBeNull();
    expect(recoveryAction(campaign, 101)).toBe("expire_unaccepted");
    expect(recoveryAction({ ...campaign, state: "ACCEPTED" }, 201)).toBe("expire_unsubmitted");
  });

  it("keeps UNRESOLVED escrow safe until attempts are exhausted or seven days pass", () => {
    const unresolved = { ...campaign, state: "UNRESOLVED", judgmentAttempts: 1, lastJudgedAt: 1_000 } as Campaign;
    expect(recoveryAction(unresolved, 1_000 + 7 * 86_400)).toBeNull();
    expect(recoveryAction(unresolved, 1_000 + 7 * 86_400 + 1)).toBe("expire_unresolved");
    expect(recoveryAction({ ...unresolved, judgmentAttempts: 3 }, 1_001)).toBe("expire_unresolved");
  });
});
