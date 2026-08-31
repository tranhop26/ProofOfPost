import { useParams } from "react-router-dom";
import { CampaignStatePanel } from "../components/CampaignStatePanel";
import { CONTRACT_CONFIGURED } from "../lib/genlayer";
import { useCampaign } from "../hooks/useCampaigns";
import { useWallet } from "../lib/wallet";
import { campaignWrites, type TransactionStage } from "../lib/contract";
import { TransactionStatus } from "../components/TransactionStatus";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

function LiveCampaign({ id }: { id: number }) {
  const query = useCampaign(id); const wallet = useWallet(); const cache = useQueryClient();
  const [stage, setStage] = useState<TransactionStage | null>(null); const [error, setError] = useState(""); const [hash, setHash] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  async function act(operation: () => Promise<{ hash: string }>) { setError(""); setHash(""); try { const result = await operation(); setHash(result.hash); await cache.invalidateQueries({ queryKey: ["campaign", id] }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaction failed."); } }
  if (query.isPending) return <div className="loading-card" role="status"><span className="spinner" />Loading campaign readback…</div>;
  if (query.error) return <div className="configuration-card error" role="alert"><h2>Readback error</h2><p>{query.error.message}</p></div>;
  const campaign = query.data; if (!campaign) return <div className="configuration-card"><h2>Campaign not found</h2></div>;
  const options = wallet.address ? { account: wallet.address, onStage: setStage } : null;
  const same = (left: string, right: string | null) => Boolean(right && left.toLowerCase() === right.toLowerCase());
  return <>
    <span className="eyebrow">Campaign #{campaign.id.toString()} · {campaign.amount.toString()} wei simulated GEN</span><h1>{campaign.title}</h1>
    <CampaignStatePanel state={campaign.state} verdictReason={campaign.verdictReason} />
    <div className="campaign-facts"><article><span>Sponsor</span><code>{campaign.sponsor}</code></article><article><span>Creator</span><code>{campaign.creator}</code></article><article><span>Evidence origin</span><code>{campaign.allowedOrigin}</code></article></div>
    <section className="terms"><h2>Frozen brief</h2><p>{campaign.brief}</p><h2>Decision rubric</h2><p>{campaign.rubric}</p></section>
    <div className="campaign-actions">
      {campaign.state === "OPEN" && same(campaign.creator, wallet.address) && <button className="button primary" onClick={() => options && void act(() => campaignWrites.accept(id, options))}>Accept frozen terms</button>}
      {campaign.state === "ACCEPTED" && same(campaign.creator, wallet.address) && <form onSubmit={(event) => { event.preventDefault(); if (options) void act(() => campaignWrites.submitEvidence(id, evidenceUrl, Math.floor(Date.now()/1000), options)); }}><label>Public evidence URL<input type="url" required value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} /></label><button className="button primary">Bind evidence on-chain</button></form>}
      {["SUBMITTED", "UNRESOLVED"].includes(campaign.state) && options && <button className="button primary" onClick={() => void act(() => campaignWrites.resolve(id, options))}>Run validator consensus</button>}
      {campaign.state === "PASSED" && options && <button className="button primary" onClick={() => void act(() => campaignWrites.settle(id, options))}>Settle to creator</button>}
      {["FAILED", "REFUNDABLE"].includes(campaign.state) && options && <button className="button primary" onClick={() => void act(() => campaignWrites.refund(id, options))}>Refund sponsor</button>}
      {!wallet.address && <p className="muted">Connect a wallet to see eligible on-chain actions.</p>}
    </div>
    <TransactionStatus stage={stage} hash={hash} error={error} />
  </>;
}

export function CampaignDetail() {
  const { id } = useParams();
  const parsed = Number(id);
  return <section className="page narrow">{!CONTRACT_CONFIGURED ? <><span className="eyebrow">Campaign #{id}</span><h1>Authoritative readback</h1><div className="configuration-card"><h2>Contract address is not configured</h2><p>A verified deployment is required before this route can read or write campaign state.</p></div></> : !Number.isSafeInteger(parsed) || parsed < 1 ? <div className="configuration-card"><h2>Invalid campaign id</h2></div> : <LiveCampaign id={parsed} />}</section>;
}
