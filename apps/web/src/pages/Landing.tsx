import { Link } from "react-router-dom";

export function Landing() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Sponsored content · settled by validator consensus</span>
        <h1>Publish.<br /><em>Prove.</em> Settle.</h1>
        <p>A sponsor locks simulated GEN before work starts. The creator publishes against frozen terms. GenLayer reads the public evidence and decides who the escrow belongs to.</p>
        <div className="hero-actions"><Link className="button primary" to="/campaigns/new">Fund a campaign</Link><Link className="button secondary" to="/dashboard">Open dashboard</Link></div>
      </div>
      <aside className="proof-card">
        <span className="card-index">01 / ESCROW</span>
        <div className="escrow-number">12.50 <small>sim GEN</small></div>
        <div className="proof-line"><span>Sponsor</span><strong>funds first</strong></div>
        <div className="proof-line"><span>Creator</span><strong>one evidence URL</strong></div>
        <div className="proof-line"><span>Decision</span><strong>GenLayer consensus</strong></div>
        <div className="proof-seal">NO BACKEND<br />NO OVERRIDE</div>
      </aside>
    </section>
    <section className="steps" aria-label="How it works">
      <article><b>01</b><h2>Lock</h2><p>The sponsor creates immutable terms and places simulated GEN in contract custody.</p></article>
      <article><b>02</b><h2>Publish</h2><p>The named creator accepts, posts publicly, and binds the evidence URL on-chain.</p></article>
      <article><b>03</b><h2>Judge</h2><p>Validators compare the post to the brief. PASS pays; FAIL refunds; uncertainty stays safe.</p></article>
    </section>
  </>;
}
