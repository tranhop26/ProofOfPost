# Successor Happy-Path Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish campaign `2` evidence and complete one verified 1 simulated GEN happy path on the active ProofOfPost successor.

**Architecture:** Add one passive static HTML evidence page under the existing Vite public directory. Use the production frontend for sponsor funding and contract-backed readback, then use the bound actor accounts for acceptance, submission, neutral resolution, and permissionless settlement. No contract or backend changes are allowed.

**Tech Stack:** Static HTML/CSS, React/Vite production app, GenLayer Studionet, GenLayer Studio/SDK, Vercel, Vitest, pytest.

## Global Constraints

- Active contract: `0x26775c839ea1D22bbB30959aB3Ae8544023eF09B`.
- Campaign ID: `2`; campaign `1` is the terminal self-deal regression.
- Sponsor: `0x21b45103dd05c43969daF3CbB4277391777e2eC7`.
- Creator: `0x94dBCa71a30942e43B6558aA624d0D24b9C2ef46`.
- Resolver: `0x9B3d594235818E8E502A1077c4f75F3d5b7d9c7A`.
- Escrow: exactly `1` simulated Studionet GEN, never described as real money.
- The Intelligent Contract remains authoritative; no mock state, backend verdict, owner override, or caller-selected recipient.
- Stop for action-time identity confirmation before GitHub push or Vercel deployment.

---

### Task 1: Bound static evidence page

**Files:**
- Create: `apps/web/public/proofs/campaign-2.html`
- Reference: `apps/web/public/proofs/campaign-1.html`

**Interfaces:**
- Consumes: production origin `https://proof-of-post.vercel.app` and the fixed actor/contract identifiers above.
- Produces: `https://proof-of-post.vercel.app/proofs/campaign-2.html`, a stable public text-renderable evidence URL.

- [ ] **Step 1: Copy the existing static-page structure into `campaign-2.html`**

Keep responsive CSS and replace all material bindings with campaign `2`, the active successor, and the fixed actors. Include the literal disclosure: `Sponsored verification disclosure` and `1 simulated Studionet GEN`.

- [ ] **Step 2: Verify stale bindings are absent**

Run:

```powershell
Select-String -Path apps/web/public/proofs/campaign-2.html -Pattern '0x8197823','campaign #1','Campaign 1'
```

Expected: no matches.

- [ ] **Step 3: Run local verification**

Run:

```powershell
pnpm lint:genvm
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration
```

Expected: every command exits `0`.

- [ ] **Step 4: Commit the evidence page**

```powershell
git add -- apps/web/public/proofs/campaign-2.html
git commit -m "docs: add successor campaign evidence"
```

### Task 2: Deploy evidence and prove availability

**Files:**
- No source changes.

**Interfaces:**
- Consumes: committed evidence page and Vercel project `tdh-s-projects/proof-of-post`.
- Produces: an HTTP `200` public evidence URL containing the exact active bindings.

- [ ] **Step 1: Verify identities without mutation**

Check Git author, GitHub account/remote, Vercel account/team/project, clean staged content, and absence of secrets.

- [ ] **Step 2: Obtain action-time confirmation**

State the exact commit to push and exact Vercel team/project to deploy. Do not push or deploy until confirmed.

- [ ] **Step 3: Push and deploy production**

Use the stored Vercel credential only through `VERCEL_TOKEN` in the process environment. Build with:

```text
VITE_GENLAYER_NETWORK=studionet
VITE_PROOF_OF_POST_ADDRESS=0x26775c839ea1D22bbB30959aB3Ae8544023eF09B
```

- [ ] **Step 4: Browser verification**

Open the public evidence URL and verify the campaign, contract, sponsor, creator, disclosure, and responsive rendering are visible.

### Task 3: Execute active-successor happy path

**Files:**
- Modify after live completion: `docs/proof-matrix.md`
- Modify after live completion: `README.md`

**Interfaces:**
- Consumes: public evidence URL and three fixed actors.
- Produces: live transaction hashes and terminal contract readback for campaign `2`.

- [ ] **Step 1: Sponsor creates campaign from production frontend**

Use 1 simulated GEN, creator `0x94dB…ef46`, allowed origin `https://proof-of-post.vercel.app`, ordered future deadlines, and a rubric requiring the bound identity, timing, workflow description, and sponsorship disclosure. Wait for `FINALIZED / SUCCESS`, then require campaign `2` readback state `OPEN` and active escrow `1 GEN`.

- [ ] **Step 2: Creator accepts and submits evidence**

Switch to the bound creator account. Call `accept_campaign(2)`, wait for `ACCEPTED`, then call `submit_evidence(2, "https://proof-of-post.vercel.app/proofs/campaign-2.html", published_at)` with a timestamp inside the accepted window. Require `SUBMITTED` readback and a non-empty evidence digest.

- [ ] **Step 3: Neutral resolver triggers consensus**

Switch to `0x9B3d…9c7A`, call `resolve_campaign(2)`, and wait for finalization. If state is `UNRESOLVED`, preserve funds and follow only the encoded retry/cooldown path. If `FAILED`, refund. If `PASSED`, continue.

- [ ] **Step 4: Permissionless settlement**

From the unrelated resolver, call `settle(2)`. Require `PAID`, `settled = true`, active escrow `0`, completed payouts increased by `1 GEN`, and a finalized child transfer credited to the fixed creator.

- [ ] **Step 5: Check conservation and replay safety**

Verify physical balance equals active escrow and:

```text
total_inflows = active_escrow + completed_payouts + completed_refunds
```

Attempt no extra value transfer. Confirm a repeated settlement is rejected through existing automated coverage or one zero-value live error if needed.

### Task 4: Fix final evidence package

**Files:**
- Modify: `docs/proof-matrix.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all live transaction hashes and readbacks from Task 3.
- Produces: exact repository evidence for judges and final handoff.

- [ ] **Step 1: Add active happy-path rows**

Record actor, action, method, transaction, finalization/execution, state/readback, and source/test for create, accept, submit, resolve, settle, and child payout.

- [ ] **Step 2: Update limitations**

Remove only the limitation that the active successor lacks a live happy path. Preserve Studionet, validator, evidence-mutability, and frozen-contract limitations.

- [ ] **Step 3: Re-run all verification and readback**

Run lint, typecheck, build, all tests, integration tests, secret scan, `git diff --check`, and deployed-source readback.

- [ ] **Step 4: Review, confirm, push, and verify production**

Obtain action-time confirmation for the exact evidence commit and Vercel project if another frontend deployment is required. Push only reviewed files, verify the remote commit, then exercise production campaign `2` readback in Chrome.
