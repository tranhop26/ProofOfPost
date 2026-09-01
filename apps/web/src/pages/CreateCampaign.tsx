import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../lib/wallet";
import { createCampaign, parseGenToWei, type TransactionStage } from "../lib/contract";
import { TransactionStatus } from "../components/TransactionStatus";

export function CreateCampaign() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const [stage, setStage] = useState<TransactionStage | null>(null);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet.address) return;
    setError(""); setHash("");
    const data = new FormData(event.currentTarget);
    try {
      const acceptBy = Math.floor(new Date(String(data.get("acceptBy"))).getTime() / 1000);
      const submitBy = Math.floor(new Date(String(data.get("submitBy"))).getTime() / 1000);
      if (!Number.isFinite(acceptBy) || !Number.isFinite(submitBy)) throw new Error("Both deadlines are required.");
      const result = await createCampaign({
        creator: String(data.get("creator")), title: String(data.get("title")), brief: String(data.get("brief")), rubric: String(data.get("rubric")),
        allowedOrigin: String(data.get("origin")), creatorHandle: String(data.get("handle")), acceptBy, submitBy,
        amountWei: parseGenToWei(String(data.get("amount")))
      }, { account: wallet.address, onStage: setStage, onHash: setHash });
      setHash(result.hash);
      navigate(`/campaigns/${result.readback.id.toString()}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Campaign transaction failed."); }
  }
  return <section className="page form-page">
    <div><span className="eyebrow">Create immutable escrow</span><h1>Fund a campaign.</h1><p className="lede">Write the decision before the work begins. After funding, neither party can rewrite the brief, rubric, identity, origin, or recipients.</p></div>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label>Creator wallet<input name="creator" required placeholder="0x…" /></label>
        <label>Creator handle<input name="handle" required placeholder="@creator" /></label>
        <label className="wide">Campaign title<input name="title" required maxLength={120} placeholder="Orbit Desk launch" /></label>
        <label className="wide">Public evidence origin<input name="origin" required placeholder="https://creator.example" /></label>
        <label className="wide">Brief<textarea name="brief" required rows={5} placeholder="What must be published, and by when?" /></label>
        <label className="wide">Decision rubric<textarea name="rubric" required rows={5} placeholder="Exact identity, content, timing and disclosure requirements." /></label>
        <label>Accept by<input name="acceptBy" type="datetime-local" required /></label>
        <label>Submit by<input name="submitBy" type="datetime-local" required /></label>
        <label>Escrow amount<input name="amount" type="number" min="0.000001" step="0.000001" required placeholder="10" /><small>simulated GEN on Studionet — not real money</small></label>
      </div>
      <label className="ack"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I understand the terms and recipients freeze after this transaction.</label>
      <button className="button primary submit" disabled={!wallet.address || !acknowledged}>{wallet.address ? "Review and fund escrow" : "Connect wallet first"}</button>
      <TransactionStatus stage={stage} hash={hash} error={error} />
    </form>
  </section>;
}
