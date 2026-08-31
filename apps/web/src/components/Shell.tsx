import { Link, NavLink, Outlet } from "react-router-dom";
import { useWallet } from "../lib/wallet";

function short(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }

export function Shell() {
  const wallet = useWallet();
  return <div className="app-shell">
    <header className="site-header">
      <Link to="/" className="brand" aria-label="ProofOfPost home"><span className="brand-mark">P/</span>PROOF OF POST</Link>
      <nav aria-label="Main navigation">
        <NavLink to="/dashboard">Campaigns</NavLink>
        <NavLink to="/campaigns/new">New escrow</NavLink>
      </nav>
      {wallet.address
        ? <button className="wallet-button connected" onClick={wallet.disconnect}>{short(wallet.address)}</button>
        : <button className="wallet-button" onClick={() => void wallet.connect()} disabled={wallet.connecting}>{wallet.connecting ? "Connecting…" : "Connect wallet"}</button>}
    </header>
    {wallet.error && <div className="wallet-error" role="alert">{wallet.error}</div>}
    <main><Outlet /></main>
    <footer><span>ProofOfPost · INTENTIONALLY_FROZEN</span><span>Studionet value is simulated GEN</span></footer>
  </div>;
}
