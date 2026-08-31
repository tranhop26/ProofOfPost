import { CONTRACT_CONFIGURED } from "../lib/genlayer";
import { Link } from "react-router-dom";
import { useWallet } from "../lib/wallet";
import { useAddressCampaigns } from "../hooks/useCampaigns";
import type { Campaign } from "@proofofpost/shared";

function CampaignList({ title, campaigns }: { title: string; campaigns: Campaign[] }) {
  return <section className="campaign-group"><h2>{title}</h2>{campaigns.length === 0 ? <p className="muted">No campaigns for this role.</p> : <div className="campaign-grid">{campaigns.map((campaign) => <Link to={`/campaigns/${campaign.id}`} className="campaign-card" key={campaign.id.toString()}><span className="eyebrow">#{campaign.id.toString()} · {campaign.state}</span><h3>{campaign.title}</h3><p>{campaign.amount.toString()} wei held by contract</p></Link>)}</div>}</section>;
}

function LiveDashboard() {
  const wallet = useWallet();
  const queries = useAddressCampaigns(wallet.address);
  if (!wallet.address) return <div className="configuration-card"><h2>Connect a wallet</h2><p>The dashboard reads sponsor and creator indexes for the connected address.</p></div>;
  if (queries.sponsor.isPending || queries.creator.isPending) return <div className="loading-card" role="status"><span className="spinner" />Loading authoritative contract state…</div>;
  const error = queries.sponsor.error || queries.creator.error;
  if (error) return <div className="configuration-card error" role="alert"><h2>Readback error</h2><p>{error.message}</p></div>;
  return <><CampaignList title="Sponsored by you" campaigns={queries.sponsor.data ?? []} /><CampaignList title="Assigned to you" campaigns={queries.creator.data ?? []} /></>;
}

export function Dashboard() {
  return <section className="page narrow">
    <span className="eyebrow">Campaign registry</span><h1>Escrows, without the inbox.</h1>
    {!CONTRACT_CONFIGURED ? <div className="configuration-card" role="status"><h2>Contract address is not configured</h2><p>This build will not invent campaigns. Set <code>VITE_PROOF_OF_POST_ADDRESS</code> to a verified deployment to read live on-chain records.</p></div>
      : <LiveDashboard />}
  </section>;
}
