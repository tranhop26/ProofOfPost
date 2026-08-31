import type { CampaignState } from "@proofofpost/shared";

const COPY: Record<CampaignState, { label: string; detail: string }> = {
  OPEN: { label: "Awaiting creator", detail: "The escrow is locked. Only the named creator can accept." },
  ACCEPTED: { label: "Work in progress", detail: "Terms are frozen and the creator can submit one public evidence URL." },
  SUBMITTED: { label: "Ready for consensus", detail: "Evidence is bound on-chain and ready for validator judgment." },
  UNRESOLVED: { label: "Consensus unresolved", detail: "No payout or favorable default occurred. Retry or wait for safe recovery." },
  PASSED: { label: "Evidence passed", detail: "The creator is the fixed settlement recipient." },
  FAILED: { label: "Evidence failed", detail: "The sponsor is the fixed refund recipient." },
  REFUNDABLE: { label: "Refund available", detail: "Anyone may trigger the refund; funds return only to the sponsor." },
  PAID: { label: "Creator paid", detail: "Settlement is terminal and cannot be replayed." },
  REFUNDED: { label: "Sponsor refunded", detail: "Refund is terminal and cannot be replayed." }
};

export function CampaignStatePanel({ state, verdictReason }: { state: CampaignState; verdictReason?: string }) {
  const copy = COPY[state];
  return <section className={`state-panel state-${state.toLowerCase()}`} role="status" aria-live="polite">
    <span className="eyebrow">On-chain state · {state}</span>
    <h2>{copy.label}</h2>
    <p>{verdictReason || copy.detail}</p>
  </section>;
}
