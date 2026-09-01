import { describe, expect, it } from "vitest";
import { readAccounting, readCampaign } from "../lib/contract";
import { CONTRACT_ADDRESS, NETWORK, readClient } from "../lib/genlayer";

const ACTIVE_CONTRACT = "0x26775c839ea1D22bbB30959aB3Ae8544023eF09B";
const SPONSOR = "0x21b45103dd05c43969daF3CbB4277391777e2eC7";
const CREATOR = "0x94dBCa71a30942e43B6558aA624d0D24b9C2ef46";
const RESOLVER = "0x9B3d594235818E8E502A1077c4f75F3d5b7d9c7A";
const ONE_GEN = 10n ** 18n;
const TITLE = "ProofOfPost successor verification";
const BRIEF = "Publish campaign 2 evidence identifying the ProofOfPost creator wallet and sponsor wallet, describing sponsor funding, creator acceptance and evidence submission, GenLayer validator review, PASS payout, FAIL refund, and safe UNRESOLVED recovery. Include an explicit sponsored-content disclosure and state that 1 Studionet GEN is simulated test value.";
const RUBRIC = "PASS only if the public page is on the frozen origin, identifies campaign 2 and contract 0x26775c839ea1D22bbB30959aB3Ae8544023eF09B, matches creator 0x94dBCa71a30942e43B6558aA624d0D24b9C2ef46, is submitted within the accepted window, accurately describes the escrow workflow, and clearly discloses sponsorship plus simulated GEN.";
const ACCEPT_BY = 1_788_251_760;
const SUBMIT_BY = 1_788_273_360;
const PUBLISHED_AT = 1_788_244_939;
type TransactionHash = Parameters<ReturnType<typeof readClient>["getTransaction"]>[0]["hash"];

function transactionHash(value: string): TransactionHash {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`Invalid transaction hash fixture: ${value}`);
  return value as TransactionHash;
}

const TRANSACTIONS = {
  create: transactionHash("0x4ae75e748f4e0558e61e6e8fd3a0db54603f263d6ce6f74c71d00d63cb930f8f"),
  accept: transactionHash("0x4ea2c2b26b8f32d8782bc4db8a08f6edebd7fb7ef36f508470b9141d4bf80a6e"),
  submit: transactionHash("0xd511585a68d41b148993451feb80f45a0d7b183bd7e6339e2ea023b922459ee4"),
  failedResolve: transactionHash("0xd809ab1f9ba27c718d81638af43523788ca2ca4b2f485e59fd4ccabcee2e7398"),
  retryResolve: transactionHash("0x485b34208d5fd92591843effff6d5d8cf67d22f8727db53a12bd318f1b433c73"),
  settle: transactionHash("0xa3b034113cc7e2eb8fbcffd68a2d6097790318294fe9e06f58dbb61f9ca88177"),
  payout: transactionHash("0x1db314cc369b44aa2d72b188aa185a254d2b12cd20c1ba9d49328963169ca20b")
} as const;

const live = import.meta.env.MODE === "integration" ? describe : describe.skip;

function transactionRecord(value: unknown): Record<string, unknown> {
  expect(value).toBeTruthy();
  expect(typeof value).toBe("object");
  return value as Record<string, unknown>;
}

function status(record: Record<string, unknown>): string {
  return String(record.statusName ?? record.status_name ?? record.status ?? "").toUpperCase();
}

function consensus(record: Record<string, unknown>): string {
  return String(record.resultName ?? record.result_name ?? record.result ?? "").toUpperCase();
}

function execution(record: Record<string, unknown>): string {
  const consensusData = record.consensus_data as Record<string, unknown> | undefined;
  const receipts = consensusData?.leader_receipt;
  if (!Array.isArray(receipts)) return "";
  const leader = receipts.find((value) => value && typeof value === "object" && "execution_result" in value);
  return String((leader as Record<string, unknown> | undefined)?.execution_result ?? "").toUpperCase();
}

function expectCall(record: Record<string, unknown>, sender: string, method: string, argsBinding: string, value = 0n): void {
  expect(String(record.sender ?? record.from_address).toLowerCase()).toBe(sender.toLowerCase());
  expect(String(record.recipient ?? record.to_address).toLowerCase()).toBe(ACTIVE_CONTRACT.toLowerCase());
  const readable = String(((record.data as Record<string, unknown>)?.calldata as Record<string, unknown>)?.readable ?? "");
  expect(readable).toContain(`"method":"${method}"`);
  expect(readable.toLowerCase()).toContain(argsBinding.toLowerCase());
  expect(BigInt(String(record.value ?? 0))).toBe(value);
}

live("active ProofOfPost Studionet deployment", () => {
  it("reads the finalized campaign and custody accounting through the frontend adapter", async () => {
    expect(NETWORK).toBe("studionet");
    expect(CONTRACT_ADDRESS.toLowerCase()).toBe(ACTIVE_CONTRACT.toLowerCase());

    const campaign = await readCampaign(2);
    expect(campaign).toMatchObject({
      id: 2n,
      sponsor: SPONSOR,
      creator: CREATOR,
      amount: ONE_GEN,
      title: TITLE,
      brief: BRIEF,
      rubric: RUBRIC,
      allowedOrigin: "https://proof-of-post.vercel.app",
      creatorHandle: "ProofOfPost",
      acceptBy: ACCEPT_BY,
      submitBy: SUBMIT_BY,
      publishedAt: PUBLISHED_AT,
      state: "PAID",
      verdict: "PASS",
      settled: true
    });
    expect(campaign?.canonicalEvidenceUrl).toBe("https://proof-of-post.vercel.app/proofs/campaign-2.html");
    expect(campaign?.evidenceDigest).toBe("sha256:6b0cd296e0a6a1db5288f5a9993e34619aa3612e6fcee20b09e6192037294ef2");
    expect(campaign?.judgmentAttempts).toBe(1);
    expect(campaign?.verdictReason).toMatch(/campaign 2.*UNRESOLVED/i);

    await expect(readAccounting()).resolves.toEqual({
      totalInflows: 2n * ONE_GEN,
      activeEscrow: 0n,
      completedPayouts: ONE_GEN,
      completedRefunds: ONE_GEN
    });
    await expect(readClient().getBalance({ address: CONTRACT_ADDRESS })).resolves.toBe(0n);
  }, 30_000);

  it("reads the real happy path and safe consensus-failure transactions", async () => {
    const client = readClient();
    const calls = [
      { hash: TRANSACTIONS.create, sender: SPONSOR, method: "create_campaign", argsBinding: TITLE, value: ONE_GEN },
      { hash: TRANSACTIONS.accept, sender: CREATOR, method: "accept_campaign", argsBinding: "\"args\":[2,", value: 0n },
      { hash: TRANSACTIONS.submit, sender: CREATOR, method: "submit_evidence", argsBinding: `[2,"https://proof-of-post.vercel.app/proofs/campaign-2.html",${PUBLISHED_AT}`, value: 0n },
      { hash: TRANSACTIONS.retryResolve, sender: RESOLVER, method: "resolve_campaign", argsBinding: "\"args\":[2,", value: 0n },
      { hash: TRANSACTIONS.settle, sender: RESOLVER, method: "settle", argsBinding: "\"args\":[2,", value: 0n }
    ];
    const records = new Map<string, Record<string, unknown>>();
    for (const call of calls) {
      const transaction = transactionRecord(await client.getTransaction({ hash: call.hash }));
      records.set(call.method, transaction);
      expect(status(transaction)).toBe("FINALIZED");
      expect(consensus(transaction)).toBe("MAJORITY_AGREE");
      expect(execution(transaction)).toBe("SUCCESS");
      expectCall(transaction, call.sender, call.method, call.argsBinding, call.value);
    }

    const createReadable = String((((records.get("create_campaign")?.data as Record<string, unknown>)?.calldata as Record<string, unknown>)?.readable ?? ""));
    for (const binding of [BRIEF, RUBRIC, "https://proof-of-post.vercel.app", "ProofOfPost", String(ACCEPT_BY), String(SUBMIT_BY)]) {
      expect(createReadable).toContain(binding);
    }

    const failedResolve = transactionRecord(await client.getTransaction({ hash: TRANSACTIONS.failedResolve }));
    expect(status(failedResolve)).toBe("FINALIZED");
    expect(consensus(failedResolve)).toBe("MAJORITY_DISAGREE");
    expectCall(failedResolve, RESOLVER, "resolve_campaign", "\"args\":[2,");

    const settleConsensus = records.get("settle")?.consensus_data as Record<string, unknown> | undefined;
    const settleReceipts = settleConsensus?.leader_receipt as Array<Record<string, unknown>> | undefined;
    const pendingPayout = settleReceipts?.flatMap((receipt) => receipt.pending_transactions as Array<Record<string, unknown>> ?? [])
      .find((pending) => String(pending.address).toLowerCase() === CREATOR.toLowerCase());
    expect(pendingPayout).toMatchObject({ is_eth_send: true, on: "finalized" });
    expect(String(pendingPayout?.value)).toBe(ONE_GEN.toString());

    const payout = transactionRecord(await client.getTransaction({ hash: TRANSACTIONS.payout }));
    expect(status(payout)).toBe("FINALIZED");
    expect(payout.value_credited ?? payout.valueCredited).toBe(true);
    expect(String(payout.sender ?? payout.from_address).toLowerCase()).toBe(ACTIVE_CONTRACT.toLowerCase());
    expect(String(payout.recipient ?? payout.to_address).toLowerCase()).toBe(CREATOR.toLowerCase());
    expect(BigInt(String(payout.value))).toBe(ONE_GEN);
    expect(String(payout.triggered_by).toLowerCase()).toBe(TRANSACTIONS.settle.toLowerCase());
  }, 30_000);
});
