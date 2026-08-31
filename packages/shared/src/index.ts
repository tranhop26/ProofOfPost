export const CAMPAIGN_STATES = [
  "OPEN",
  "ACCEPTED",
  "SUBMITTED",
  "UNRESOLVED",
  "PASSED",
  "FAILED",
  "REFUNDABLE",
  "PAID",
  "REFUNDED"
] as const;

export type CampaignState = (typeof CAMPAIGN_STATES)[number];

export const VERDICTS = ["NONE", "PASS", "FAIL", "UNRESOLVED"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface Campaign {
  id: bigint;
  sponsor: `0x${string}`;
  creator: `0x${string}`;
  amount: bigint;
  title: string;
  brief: string;
  rubric: string;
  allowedOrigin: string;
  creatorHandle: string;
  state: CampaignState;
  verdict: Verdict;
  createdAt: number;
  acceptedAt: number;
  acceptBy: number;
  submitBy: number;
  submittedAt: number;
  publishedAt: number;
  canonicalEvidenceUrl: string;
  evidenceDigest: string;
  judgmentAttempts: number;
  lastJudgedAt: number;
  verdictReason: string;
  settled: boolean;
}

type RawRecord = Record<string, unknown>;

function record(value: unknown): RawRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("campaign must be an object");
  }
  return value as RawRecord;
}

function stringField(raw: RawRecord, key: string): string {
  const value = raw[key];
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
}

function addressField(raw: RawRecord, key: string): `0x${string}` {
  const value = stringField(raw, key);
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`${key} must be an address`);
  return value as `0x${string}`;
}

function bigintField(raw: RawRecord, key: string): bigint {
  const value = raw[key];
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new Error(`${key} must be an integer`);
  }
  try {
    return BigInt(value);
  } catch {
    throw new Error(`${key} must be an integer`);
  }
}

function numberField(raw: RawRecord, key: string): number {
  const value = bigintField(raw, key);
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${key} is outside the safe integer range`);
  }
  return Number(value);
}

function booleanField(raw: RawRecord, key: string): boolean {
  const value = raw[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

function enumField<T extends readonly string[]>(raw: RawRecord, key: string, values: T): T[number] {
  const value = stringField(raw, key);
  if (!values.includes(value)) throw new Error(`${key} is unknown`);
  return value as T[number];
}

export function parseCampaign(value: unknown): Campaign {
  const raw = record(value);
  return {
    id: bigintField(raw, "id"),
    sponsor: addressField(raw, "sponsor"),
    creator: addressField(raw, "creator"),
    amount: bigintField(raw, "amount"),
    title: stringField(raw, "title"),
    brief: stringField(raw, "brief"),
    rubric: stringField(raw, "rubric"),
    allowedOrigin: stringField(raw, "allowed_origin"),
    creatorHandle: stringField(raw, "creator_handle"),
    state: enumField(raw, "state", CAMPAIGN_STATES),
    verdict: enumField(raw, "verdict", VERDICTS),
    createdAt: numberField(raw, "created_at"),
    acceptedAt: numberField(raw, "accepted_at"),
    acceptBy: numberField(raw, "accept_by"),
    submitBy: numberField(raw, "submit_by"),
    submittedAt: numberField(raw, "submitted_at"),
    publishedAt: numberField(raw, "published_at"),
    canonicalEvidenceUrl: stringField(raw, "canonical_evidence_url"),
    evidenceDigest: stringField(raw, "evidence_digest"),
    judgmentAttempts: numberField(raw, "judgment_attempts"),
    lastJudgedAt: numberField(raw, "last_judged_at"),
    verdictReason: stringField(raw, "verdict_reason"),
    settled: booleanField(raw, "settled")
  };
}

export function canResolve(state: CampaignState): boolean {
  return state === "SUBMITTED" || state === "UNRESOLVED";
}

export function canSettle(state: CampaignState): boolean {
  return state === "PASSED";
}
