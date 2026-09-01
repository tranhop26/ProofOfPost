import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign } from "@proofofpost/shared";
import { Dashboard } from "./Dashboard";

const refundedCampaign: Campaign = {
  id: 1n,
  sponsor: "0x1111111111111111111111111111111111111111",
  creator: "0x1111111111111111111111111111111111111111",
  amount: 1_000_000_000_000_000_000n,
  title: "Rejected campaign",
  brief: "Creation rejected before escrow activation.",
  rubric: "No validator judgment required.",
  allowedOrigin: "https://invalid.example",
  creatorHandle: "rejected",
  state: "REFUNDED",
  verdict: "FAIL",
  createdAt: 1,
  acceptedAt: 0,
  acceptBy: 2,
  submitBy: 3,
  submittedAt: 0,
  publishedAt: 0,
  canonicalEvidenceUrl: "",
  evidenceDigest: "",
  judgmentAttempts: 0,
  lastJudgedAt: 0,
  verdictReason: "sponsor and creator must be different",
  settled: true
};
let campaign = refundedCampaign;

vi.mock("../lib/genlayer", () => ({ CONTRACT_CONFIGURED: true }));
vi.mock("../lib/wallet", () => ({ useWallet: () => ({ address: refundedCampaign.sponsor }) }));
vi.mock("../hooks/useCampaigns", () => ({
  useAddressCampaigns: () => ({
    sponsor: { data: [campaign], isPending: false, error: null },
    creator: { data: [], isPending: false, error: null }
  })
}));

describe("Dashboard custody labels", () => {
  beforeEach(() => {
    campaign = refundedCampaign;
  });

  it("labels terminal refunded value as returned instead of held by the contract", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Dashboard /></MemoryRouter>);
    expect(screen.getByText("1000000000000000000 wei refunded to sponsor")).toBeInTheDocument();
    expect(screen.queryByText(/held by contract/i)).not.toBeInTheDocument();
  });

  it("labels terminal paid value as transferred to the creator", () => {
    campaign = { ...refundedCampaign, state: "PAID", verdict: "PASS" };
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Dashboard /></MemoryRouter>);
    expect(screen.getByText("1000000000000000000 wei paid to creator")).toBeInTheDocument();
    expect(screen.queryByText(/held by contract/i)).not.toBeInTheDocument();
  });
});
