import { describe, expect, it } from "vitest";
import { writeAndConfirm, type TransactionStage } from "../lib/contract";
import { ContractHarness, type HarnessState } from "../test/contractHarness";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;

async function transact(harness: ContractHarness, method: string, expected: HarnessState, stages: TransactionStage[]) {
  return writeAndConfirm(harness, { address: ADDRESS, functionName: method, args: [] }, async () => harness.readback(), (readback) => readback.state === expected, { readbackIntervalMs: 0, onStage: (stage) => stages.push(stage) });
}

describe("promoted campaign flow through the frontend transaction boundary", () => {
  it("creates, accepts, binds evidence, resolves, settles, and reads back each state", async () => {
    const harness = new ContractHarness(); const stages: TransactionStage[] = [];
    await transact(harness, "create_campaign", "OPEN", stages);
    harness.sender = "creator";
    await transact(harness, "accept_campaign", "ACCEPTED", stages);
    await transact(harness, "submit_evidence", "SUBMITTED", stages);
    harness.sender = "unrelated-resolver";
    await transact(harness, "resolve_campaign", "PASSED", stages);
    await transact(harness, "settle", "PAID", stages);
    expect(harness.transfers).toEqual([{ to: "creator", amount: 1000n }]);
    expect(stages.filter((stage) => stage === "READBACK")).toHaveLength(5);
  });

  it("rejects the wrong actor and recovers UNRESOLVED without a favorable default", async () => {
    const harness = new ContractHarness(); const stages: TransactionStage[] = [];
    await transact(harness, "create_campaign", "OPEN", stages);
    harness.sender = "attacker";
    await expect(transact(harness, "accept_campaign", "ACCEPTED", stages)).rejects.toThrow(/only creator/i);
    expect(harness.state).toBe("OPEN");
    harness.sender = "creator"; await transact(harness, "accept_campaign", "ACCEPTED", stages); await transact(harness, "submit_evidence", "SUBMITTED", stages);
    harness.sender = "resolver"; harness.validator = "UNRESOLVED"; await transact(harness, "resolve_campaign", "UNRESOLVED", stages);
    expect(harness.transfers).toEqual([]);
    harness.advance(7 * 86400 + 1); await transact(harness, "expire_unresolved", "REFUNDABLE", stages); await transact(harness, "refund", "REFUNDED", stages);
    expect(harness.transfers).toEqual([{ to: "sponsor", amount: 1000n }]);
  });
});
