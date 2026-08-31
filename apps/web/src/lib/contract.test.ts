import { describe, expect, it } from "vitest";
import { writeAndConfirm, type ContractClient } from "./contract";

function client(receipt: unknown): ContractClient {
  return {
    writeContract: async () => "0xabc",
    waitForTransactionReceipt: async () => receipt
  };
}

describe("writeAndConfirm", () => {
  it("returns success only after finalization, execution success, and matching readback", async () => {
    let reads = 0;
    const result = await writeAndConfirm(
      client({ statusName: "FINALIZED", data: { execution_result: "SUCCESS" } }),
      { address: "0x1111111111111111111111111111111111111111", functionName: "accept_campaign", args: [1] },
      async () => ({ state: ++reads === 1 ? "OPEN" : "ACCEPTED" }),
      (value) => value.state === "ACCEPTED",
      { readbackRetries: 2, readbackIntervalMs: 0 }
    );
    expect(result).toEqual({ hash: "0xabc", finalized: true, execution: "SUCCESS", readback: { state: "ACCEPTED" } });
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
