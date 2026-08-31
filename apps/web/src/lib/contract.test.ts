import { describe, expect, it } from "vitest";
import { parseGenToWei, writeAndConfirm, type ContractClient } from "./contract";

function client(receipt: unknown): ContractClient {
  return {
    writeContract: async () => "0xabc",
    waitForTransactionReceipt: async () => receipt
  };
}

describe("writeAndConfirm", () => {
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
