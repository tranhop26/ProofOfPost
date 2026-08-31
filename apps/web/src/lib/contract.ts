export interface ContractClient {
  writeContract(request: Record<string, unknown>): Promise<string>;
  waitForTransactionReceipt(request: Record<string, unknown>): Promise<unknown>;
}

export interface ContractWriteRequest {
  address: `0x${string}`;
  functionName: string;
  args: unknown[];
  value?: bigint;
}

export interface ConfirmOptions {
  readbackRetries?: number;
  readbackIntervalMs?: number;
  onStage?: (stage: TransactionStage) => void;
}

export type TransactionStage = "SIGNING" | "PENDING" | "FINALIZED" | "SUCCESS" | "READBACK";

export interface ConfirmedWrite<T> {
  hash: string;
  finalized: true;
  execution: "SUCCESS";
  readback: T;
}

function receiptRecord(receipt: unknown): Record<string, unknown> {
  if (!receipt || typeof receipt !== "object") throw new Error("Finalization receipt is missing.");
  return receipt as Record<string, unknown>;
}

function nested(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function executionResult(receipt: Record<string, unknown>): string {
  const value = nested(receipt, "data").execution_result ?? nested(receipt, "txDataDecoded").execution_result ?? receipt.execution_result;
  return String(value ?? "").toUpperCase();
}

function finalized(receipt: Record<string, unknown>): boolean {
  const status = String(receipt.statusName ?? receipt.status ?? "").toUpperCase();
  return status === "FINALIZED";
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export async function writeAndConfirm<T>(
  client: ContractClient,
  request: ContractWriteRequest,
  readback: () => Promise<T>,
  expected: (value: T) => boolean,
  options: ConfirmOptions = {}
): Promise<ConfirmedWrite<T>> {
  options.onStage?.("SIGNING");
  const hash = await client.writeContract(request as unknown as Record<string, unknown>);
  options.onStage?.("PENDING");
  const receipt = receiptRecord(await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 100, interval: 3000 }));
  if (!finalized(receipt)) throw new Error("Transaction did not reach FINALIZED state.");
  options.onStage?.("FINALIZED");
  if (executionResult(receipt) !== "SUCCESS") throw new Error("Transaction finalized but contract execution failed.");
  options.onStage?.("SUCCESS");

  const retries = options.readbackRetries ?? 8;
  const interval = options.readbackIntervalMs ?? 750;
  let latest: T | undefined;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    latest = await readback();
    if (expected(latest)) {
      options.onStage?.("READBACK");
      return { hash, finalized: true, execution: "SUCCESS", readback: latest };
    }
    if (attempt + 1 < retries && interval > 0) await delay(interval);
  }
  throw new Error("Transaction succeeded but authoritative contract readback is stale.");
}

export function validCampaignId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function parseGenToWei(value: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value.trim())) throw new Error("GEN amount must be a plain decimal with at most 18 places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0") || "0");
  if (wei <= 0n) throw new Error("Escrow amount must be greater than zero.");
  return wei;
}

function configuredAddress(): `0x${string}` {
  if (!CONTRACT_CONFIGURED) throw new Error("ProofOfPost contract address is not configured.");
  return CONTRACT_ADDRESS;
}

function address(value: string): CalldataAddress {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("A valid 0x wallet address is required.");
  const bytes = new Uint8Array(20);
  const clean = value.slice(2);
  for (let index = 0; index < 20; index += 1) bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  return new CalldataAddress(bytes);
}

async function read(functionName: string, args: unknown[] = []): Promise<unknown> {
  return readClient().readContract({ address: configuredAddress(), functionName, args: args as never[] });
}

export async function readCampaign(id: number): Promise<Campaign | null> {
  if (!validCampaignId(id)) throw new Error("Campaign id must be a positive integer.");
  const result = await read("get_campaign", [id]);
  return result == null ? null : parseCampaign(result);
}

export async function readAddressCampaigns(role: "sponsor" | "creator", wallet: string): Promise<Campaign[]> {
  const functionName = role === "sponsor" ? "get_sponsor_campaigns" : "get_creator_campaigns";
  const result = await read(functionName, [address(wallet), 0, 50]);
  if (!Array.isArray(result)) throw new Error("Contract returned an invalid campaign list.");
  return result.map(parseCampaign);
}

export interface CreateCampaignInput {
  creator: string;
  title: string;
  brief: string;
  rubric: string;
  allowedOrigin: string;
  creatorHandle: string;
  acceptBy: number;
  submitBy: number;
  amountWei: bigint;
}

export interface WriteUiOptions extends ConfirmOptions { account: `0x${string}` }

export type RecoveryAction = "expire_unaccepted" | "expire_unsubmitted" | "expire_unresolved";

export function recoveryAction(campaign: Campaign, now: number): RecoveryAction | null {
  if (campaign.state === "OPEN" && now > campaign.acceptBy) return "expire_unaccepted";
  if (campaign.state === "ACCEPTED" && now > campaign.submitBy) return "expire_unsubmitted";
  if (
    campaign.state === "UNRESOLVED" &&
    (campaign.judgmentAttempts >= 3 || now > campaign.lastJudgedAt + 7 * 86_400)
  ) return "expire_unresolved";
  return null;
}

async function executeStateWrite(
  options: WriteUiOptions,
  functionName: string,
  campaignId: number,
  args: unknown[],
  expectedState: CampaignState,
  value = 0n
) {
  const client = writeClient(options.account);
  try { await client.initializeConsensusSmartContract(); } catch { /* Studionet may already be initialized. */ }
  return writeAndConfirm(
    client as unknown as ContractClient,
    { address: configuredAddress(), functionName, args, value },
    async () => {
      const campaign = await readCampaign(campaignId);
      if (!campaign) throw new Error("Campaign disappeared during readback.");
      return campaign;
    },
    (campaign) => campaign.state === expectedState,
    options
  );
}

export async function createCampaign(input: CreateCampaignInput, options: WriteUiOptions) {
  const before = Number(await read("get_campaign_count"));
  const expectedId = before + 1;
  return executeStateWrite(options, "create_campaign", expectedId, [
    address(input.creator), input.title, input.brief, input.rubric, input.allowedOrigin,
    input.creatorHandle, input.acceptBy, input.submitBy
  ], "OPEN", input.amountWei);
}

export const campaignWrites = {
  accept: (id: number, options: WriteUiOptions) => executeStateWrite(options, "accept_campaign", id, [id], "ACCEPTED"),
  submitEvidence: (id: number, url: string, publishedAt: number, options: WriteUiOptions) => executeStateWrite(options, "submit_evidence", id, [id, url, publishedAt], "SUBMITTED"),
  resolve: async (id: number, options: WriteUiOptions) => {
    const client = writeClient(options.account);
    try { await client.initializeConsensusSmartContract(); } catch { /* hosted Studio may already be ready */ }
    return writeAndConfirm(client as unknown as ContractClient, { address: configuredAddress(), functionName: "resolve_campaign", args: [id] }, async () => {
      const campaign = await readCampaign(id); if (!campaign) throw new Error("Campaign readback missing."); return campaign;
    }, (campaign) => ["PASSED", "FAILED", "UNRESOLVED"].includes(campaign.state), options);
  },
  settle: (id: number, options: WriteUiOptions) => executeStateWrite(options, "settle", id, [id], "PAID"),
  refund: (id: number, options: WriteUiOptions) => executeStateWrite(options, "refund", id, [id], "REFUNDED"),
  expireUnaccepted: (id: number, options: WriteUiOptions) => executeStateWrite(options, "expire_unaccepted", id, [id], "REFUNDABLE"),
  expireUnsubmitted: (id: number, options: WriteUiOptions) => executeStateWrite(options, "expire_unsubmitted", id, [id], "REFUNDABLE"),
  expireUnresolved: (id: number, options: WriteUiOptions) => executeStateWrite(options, "expire_unresolved", id, [id], "REFUNDABLE")
};
import { CalldataAddress } from "genlayer-js/types";
import { parseCampaign, type Campaign, type CampaignState } from "@proofofpost/shared";
import { CONTRACT_ADDRESS, CONTRACT_CONFIGURED, readClient, writeClient } from "./genlayer";
