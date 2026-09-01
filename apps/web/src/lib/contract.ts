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
  onHash?: (hash: string) => void;
}

export type TransactionStage = "SIGNING" | "PENDING" | "FINALIZED" | "SUCCESS" | "READBACK";

export interface ConfirmedWrite<T> {
  hash: string;
  finalized: true;
  execution: "SUCCESS";
  readback: T;
}

export class ContractTransactionError extends Error {
  readonly hash: string;

  constructor(message: string, hash: string) {
    super(message);
    this.name = "ContractTransactionError";
    this.hash = hash;
  }
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
  const leaderReceipts = nested(receipt, "consensus_data").leader_receipt;
  const leaderExecution = Array.isArray(leaderReceipts)
    ? leaderReceipts.find((value) => value && typeof value === "object" && "execution_result" in value)
    : undefined;
  const value = nested(receipt, "data").execution_result
    ?? nested(receipt, "txDataDecoded").execution_result
    ?? receipt.execution_result
    ?? (leaderExecution as Record<string, unknown> | undefined)?.execution_result;
  return String(value ?? "").toUpperCase();
}

function finalized(receipt: Record<string, unknown>): boolean {
  const status = String(receipt.statusName ?? receipt.status_name ?? receipt.status ?? "").toUpperCase();
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
  options.onHash?.(hash);
  options.onStage?.("PENDING");
  const receipt = receiptRecord(await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 100, interval: 3000 }));
  if (!finalized(receipt)) throw new ContractTransactionError("Transaction did not reach FINALIZED state.", hash);
  options.onStage?.("FINALIZED");
  if (executionResult(receipt) !== "SUCCESS") throw new ContractTransactionError("Transaction finalized but contract execution failed.", hash);
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
  throw new ContractTransactionError("Transaction succeeded but authoritative contract readback is stale.", hash);
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

export interface ContractAccounting {
  totalInflows: bigint;
  activeEscrow: bigint;
  completedPayouts: bigint;
  completedRefunds: bigint;
}

function accountingInteger(raw: Record<string, unknown>, key: string): bigint {
  const value = raw[key];
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`Contract accounting field ${key} is not a safe non-negative integer.`);
}

export function parseContractAccounting(value: unknown): ContractAccounting {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Contract returned invalid accounting data.");
  }
  const raw = value as Record<string, unknown>;
  return {
    totalInflows: accountingInteger(raw, "total_inflows"),
    activeEscrow: accountingInteger(raw, "active_escrow"),
    completedPayouts: accountingInteger(raw, "completed_payouts"),
    completedRefunds: accountingInteger(raw, "completed_refunds")
  };
}

export async function readAccounting(): Promise<ContractAccounting> {
  return parseContractAccounting(await read("get_accounting"));
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

export function validateCreateCampaignInput(input: CreateCampaignInput, sponsor: string, now: number): void {
  if (input.creator.toLowerCase() === sponsor.toLowerCase()) throw new Error("Sponsor and creator must be different wallets.");
  if (!(now < input.acceptBy && input.acceptBy < input.submitBy)) throw new Error("Campaign deadlines must be ordered in the future.");
  if (input.amountWei <= 0n) throw new Error("Escrow amount must be greater than zero.");
  const bounded = (value: string, name: string, maximum: number) => {
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > maximum) throw new Error(`${name} length is invalid.`);
    if ([...cleaned].some((character) => character.charCodeAt(0) < 32 && character !== "\n" && character !== "\t")) {
      throw new Error(`${name} contains invalid control characters.`);
    }
  };
  bounded(input.title, "Title", 120);
  bounded(input.brief, "Brief", 3_000);
  bounded(input.rubric, "Rubric", 2_000);
  bounded(input.creatorHandle, "Creator handle", 100);
  const cleanedOrigin = input.allowedOrigin.trim().replace(/\/$/, "");
  let parsed: URL;
  try { parsed = new URL(cleanedOrigin); } catch { throw new Error("Allowed origin must be a valid HTTPS origin."); }
  if (parsed.protocol !== "https:" || parsed.origin !== cleanedOrigin || parsed.username || parsed.password || parsed.port) {
    throw new Error("Allowed origin must be an HTTPS origin without a path.");
  }
}

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
  validateCreateCampaignInput(input, options.account, Math.floor(Date.now() / 1_000));
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
