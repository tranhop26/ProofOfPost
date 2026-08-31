import type { ContractClient } from "../lib/contract";

export type HarnessState = "NONE" | "OPEN" | "ACCEPTED" | "SUBMITTED" | "UNRESOLVED" | "PASSED" | "FAILED" | "REFUNDABLE" | "PAID" | "REFUNDED";

export class ContractHarness implements ContractClient {
  state: HarnessState = "NONE";
  sender = "sponsor";
  creator = "creator";
  validator: "PASS" | "FAIL" | "UNRESOLVED" = "PASS";
  now = 100;
  lastJudgedAt = 0;
  transfers: Array<{ to: string; amount: bigint }> = [];
  private pending: Record<string, unknown> | null = null;

  async writeContract(request: Record<string, unknown>): Promise<string> {
    this.pending = request;
    return `0x${String(this.now).padStart(64, "0")}`;
  }

  async waitForTransactionReceipt(): Promise<unknown> {
    if (!this.pending) throw new Error("no transaction");
    this.apply(String(this.pending.functionName));
    this.pending = null;
    return { statusName: "FINALIZED", data: { execution_result: "SUCCESS" } };
  }

  readback() { return { state: this.state }; }
  advance(seconds: number) { this.now += seconds; }

  private require(condition: boolean, message: string) { if (!condition) throw new Error(message); }
  private apply(method: string) {
    if (method === "create_campaign") { this.require(this.state === "NONE", "replay"); this.state = "OPEN"; return; }
    if (method === "accept_campaign") { this.require(this.sender === this.creator, "only creator"); this.require(this.state === "OPEN", "invalid transition"); this.state = "ACCEPTED"; return; }
    if (method === "submit_evidence") { this.require(this.sender === this.creator, "only creator"); this.require(this.state === "ACCEPTED", "invalid transition"); this.state = "SUBMITTED"; return; }
    if (method === "resolve_campaign") { this.require(this.state === "SUBMITTED" || this.state === "UNRESOLVED", "terminal replay"); this.state = this.validator === "PASS" ? "PASSED" : this.validator === "FAIL" ? "FAILED" : "UNRESOLVED"; this.lastJudgedAt = this.now; return; }
    if (method === "expire_unresolved") { this.require(this.state === "UNRESOLVED" && this.now > this.lastJudgedAt + 7 * 86400, "recovery unavailable"); this.state = "REFUNDABLE"; return; }
    if (method === "settle") { this.require(this.state === "PASSED", "not passed"); this.state = "PAID"; this.transfers.push({ to: this.creator, amount: 1000n }); return; }
    if (method === "refund") { this.require(this.state === "FAILED" || this.state === "REFUNDABLE", "not refundable"); this.state = "REFUNDED"; this.transfers.push({ to: "sponsor", amount: 1000n }); return; }
    throw new Error(`unknown method ${method}`);
  }
}
