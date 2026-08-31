import { describe, expect, it } from "vitest";
import { canResolve, canSettle, parseCampaign } from "./index";
import contractShape from "../contract-shape.json";

const rawCampaign = {
  id: "7",
  sponsor: "0x1111111111111111111111111111111111111111",
  creator: "0x2222222222222222222222222222222222222222",
  amount: "1000",
  title: "Launch note",
  brief: "Publish the launch note.",
  rubric: "Name the product and disclose sponsorship.",
  allowed_origin: "https://creator.example",
  creator_handle: "@creator",
  state: "SUBMITTED",
  verdict: "NONE",
  created_at: 10,
  accepted_at: 20,
  accept_by: 100,
  submit_by: 200,
  submitted_at: 30,
  published_at: 25,
  canonical_evidence_url: "https://creator.example/post",
  evidence_digest: "0xabc",
  judgment_attempts: 0,
  last_judged_at: 0,
  verdict_reason: "",
  settled: false
};

describe("parseCampaign", () => {
  it("normalizes integer values without losing wei precision", () => {
    const parsed = parseCampaign({ ...rawCampaign, amount: "9007199254740993" });
    expect(parsed.id).toBe(7n);
    expect(parsed.amount).toBe(9_007_199_254_740_993n);
  });

  it("rejects an unknown state instead of rendering it as a valid workflow", () => {
    expect(() => parseCampaign({ ...rawCampaign, state: "BOGUS" })).toThrow(/state/i);
  });

  it("rejects a missing contract field instead of silently defaulting it", () => {
    const { sponsor: _removed, ...missingSponsor } = rawCampaign;
    expect(() => parseCampaign(missingSponsor)).toThrow(/sponsor/i);
  });
});

describe("campaign state predicates", () => {
  it("permits judgment only for submitted or unresolved campaigns", () => {
    expect(canResolve("SUBMITTED")).toBe(true);
    expect(canResolve("UNRESOLVED")).toBe(true);
    expect(canResolve("PAID")).toBe(false);
  });

  it("permits settlement only after a passing verdict", () => {
    expect(canSettle("PASSED")).toBe(true);
    expect(canSettle("FAILED")).toBe(false);
  });
});

it("parses the representative contract view without field drift", () => {
  const parsed = parseCampaign(contractShape);
  expect(parsed.id).toBe(7n);
  expect(parsed.canonicalEvidenceUrl).toBe("https://creator.example/post");
});
