# ProofOfPost MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify a complete GenLayer sponsored-content escrow whose Intelligent Contract judges public campaign evidence and controls payout or refund.

**Architecture:** A pnpm monorepo separates the Python Intelligent Contract, cross-language state parsers, and a responsive React/Vite frontend. The contract is the only source of campaign state and custody; the frontend uses accountless reads, wallet-signed writes, finalized execution checks, and authoritative readback. Direct contract tests use a deterministic GenVM stub, while integration tests exercise the frontend service layer through the same contract adapter used by the UI.

**Tech Stack:** Python GenVM contract, `genlayer-js@^1.1.8`, pnpm 10, TypeScript 5, React 18, Vite 5, TanStack Query 5, React Router 6, Tailwind 3, Vitest, Testing Library, pytest, GenVM linter.

## Global Constraints

- The contract is `INTENTIONALLY_FROZEN`; expose no owner, upgrader, verdict override, or arbitrary withdrawal method.
- Studionet GEN is simulated and every UI/README value label must say so.
- The only promoted workflow is one sponsor, one creator, one evidence URL, bounded retries, permissionless settlement, and timeout recovery.
- No backend or database may hold authoritative campaign state.
- No private key, token, wallet seed, or deployed-address placeholder may enter source, logs, commits, README, or a real `.env`.
- All writes must distinguish signing, submitted, `FINALIZED`, execution `SUCCESS`, and contract readback.
- GitHub push, contract deployment, and Vercel deployment remain blocked pending action-time identity checks and user confirmation.

## File Map

- `packages/contracts/proof_of_post.py`: records, authorization, state machine, evidence judgment, custody, views.
- `packages/contracts/tests/_stubs/genlayer.py`: deterministic GenVM primitives, context, nondeterministic validator hook, transfer journal.
- `packages/contracts/tests/test_*.py`: state, evidence, judgment, custody, invariants, and view-shape tests.
- `packages/contracts/scripts/deploy.mjs`: environment-only deployment and fixed manifest output.
- `packages/contracts/scripts/e2e.mjs`: live create-to-settle plus critical failure/readback workflow.
- `packages/contracts/scripts/readback.mjs`: deployed code/schema/config verification.
- `packages/shared/src/index.ts`: campaign types, strict parsers, state predicates.
- `packages/shared/evidence-url-vectors.json`: shared allow/deny cases for Python and TypeScript.
- `apps/web/src/lib/genlayer.ts`: network, accountless read client, wallet write client, explorer URLs.
- `apps/web/src/lib/contract.ts`: typed contract calls and transaction lifecycle checks.
- `apps/web/src/lib/wallet.tsx`: explicit wallet connection and account/network change handling.
- `apps/web/src/hooks/useCampaigns.ts`: reads, polling, mutations, cache invalidation, readback reconciliation.
- `apps/web/src/pages/*.tsx`: landing, dashboard, create, campaign detail, not-found routes.
- `apps/web/src/components/*.tsx`: shell, transaction status, campaign cards, state timeline, evidence/verdict panels.
- `deployments/*.json`: immutable deployment manifests created only after authorized deployment.
- `docs/recovery.md`: intentionally-frozen migration and timeout recovery runbook.
- `README.md`: concise setup, architecture, environment, test, deployment, use, limitations, and proof matrix.

---

### Task 1: Monorepo scaffold and shared contract model

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `vercel.json`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`
- Create: `packages/shared/evidence-url-vectors.json`

**Interfaces:**
- Produces: `CampaignState`, `Verdict`, `Campaign`, `parseCampaign(raw)`, `canResolve(state)`, `canSettle(state)`, and URL test vectors consumed by contract and web tasks.

- [ ] **Step 1: Write failing parser and state-predicate tests**

```ts
expect(parseCampaign({ id: "7", amount: "1000", state: "SUBMITTED" }).id).toBe(7n);
expect(canResolve("SUBMITTED")).toBe(true);
expect(canResolve("PAID")).toBe(false);
expect(canSettle("PASSED")).toBe(true);
expect(() => parseCampaign({ id: "7", state: "BOGUS" })).toThrow(/state/i);
```

- [ ] **Step 2: Run `pnpm --filter @proofofpost/shared test` and confirm it fails because the package/model does not exist**
- [ ] **Step 3: Add workspace configuration, exact scripts, strict union types, bigint normalization, and parsers that reject absent/unknown fields**
- [ ] **Step 4: Add URL vectors covering public HTTPS, credentials, ports, fragments, loopback, RFC1918, link-local, metadata hosts, reserved names, and ambiguous numeric hosts**
- [ ] **Step 5: Run shared tests and `pnpm --filter @proofofpost/shared build`; expect both to pass**
- [ ] **Step 6: Commit with `feat: scaffold shared campaign model`**

### Task 2: Contract state machine, authorization, and escrow accounting

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/proof_of_post.py`
- Create: `packages/contracts/tests/conftest.py`
- Create: `packages/contracts/tests/_stubs/genlayer.py`
- Create: `packages/contracts/tests/test_lifecycle.py`
- Create: `packages/contracts/tests/test_custody.py`

**Interfaces:**
- Produces contract methods `create_campaign(creator, title, brief, rubric, allowed_origin, creator_handle, accept_by, submit_by)`, `accept_campaign(id)`, `expire_unaccepted(id)`, `expire_unsubmitted(id)`, `settle(id)`, `refund(id)`, and `get_campaign(id)`.
- Produces accounting views `get_accounting()` returning `total_inflows`, `active_escrow`, `completed_payouts`, and `completed_refunds`.

- [ ] **Step 1: Write failing lifecycle tests for sponsor creation, exact creator acceptance, expiry, and every invalid actor/transition**

```python
with ctx(sender=SPONSOR, value=1_000):
    campaign_id = contract.create_campaign(CREATOR, "Launch", BRIEF, RUBRIC, ORIGIN, "@creator", 200, 400)
with pytest.raises(Exception, match="only creator"):
    with ctx(sender=STRANGER): contract.accept_campaign(campaign_id)
with ctx(sender=CREATOR): contract.accept_campaign(campaign_id)
assert contract.get_campaign(campaign_id)["state"] == "ACCEPTED"
```

- [ ] **Step 2: Run the targeted lifecycle tests and confirm imports/methods fail**
- [ ] **Step 3: Implement focused `Campaign` storage, indexes, monotonic IDs, field bounds, actor checks, and deadline transitions**
- [ ] **Step 4: Write failing custody tests for zero value, self-dealing, unauthorized refund, recipient substitution, double settlement/refund, and payout-after-refund**
- [ ] **Step 5: Implement checks-effects-interactions settlement and the conservation counters; transfer destinations must come only from stored addresses**
- [ ] **Step 6: Run lifecycle/custody tests and assert after every mutation that `inflows == active + payouts + refunds`**
- [ ] **Step 7: Commit with `feat: add campaign escrow state machine`**

### Task 3: Evidence validation, semantic judgment, and safe UNRESOLVED

**Files:**
- Modify: `packages/contracts/proof_of_post.py`
- Modify: `packages/contracts/tests/_stubs/genlayer.py`
- Create: `packages/contracts/tests/test_evidence.py`
- Create: `packages/contracts/tests/test_judgment.py`
- Create: `packages/contracts/tests/test_url_rules.py`

**Interfaces:**
- Produces `submit_evidence(id, url, published_at)`, `resolve_campaign(id)`, and `expire_unresolved(id)`.
- Stores `canonical_evidence_url`, `evidence_digest`, `submitted_at`, `published_at`, `judgment_attempts`, `last_judged_at`, `verdict`, `verdict_reason`, and normalized checks.

- [ ] **Step 1: Load the shared URL vectors in Python and write a failing parametrized test for exact contract/UI agreement**
- [ ] **Step 2: Implement canonical public-HTTPS validation and a deterministic evidence digest over chain, contract, campaign, URL, version, timestamps, and attempt domain**
- [ ] **Step 3: Write failing evidence tests for wrong actor, duplicate submission, stale/future publication time, wrong origin, malformed URL, and cross-campaign replay**
- [ ] **Step 4: Implement `submit_evidence` with frozen-origin comparison and one-submission lock**
- [ ] **Step 5: Write failing judgment tests for exact `PASS`, exact `FAIL`, malformed result, disagreement, timeout, cooldown, exhausted attempts, terminal replay, and prompt injection delimiters**

```python
validator.result = {"outcome":"PASS","identity":True,"timing":True,"content":True,"disclosure":True,"reason":"matched"}
with ctx(sender=STRANGER): contract.resolve_campaign(campaign_id)
assert contract.get_campaign(campaign_id)["state"] == "PASSED"
```

- [ ] **Step 6: Implement fenced untrusted content, bounded web fetch, strict result parsing, material-field comparative equivalence, attempt counting, and fail-closed `UNRESOLVED`**
- [ ] **Step 7: Implement permissionless `expire_unresolved` after attempts are exhausted or the fixed recovery timeout passes**
- [ ] **Step 8: Run evidence/judgment/URL suites and commit with `feat: add consensus evidence judgment`**

### Task 4: Contract adversarial coverage, schema, and GenVM validation

**Files:**
- Create: `packages/contracts/tests/test_invariants.py`
- Create: `packages/contracts/tests/test_views.py`
- Create: `packages/shared/contract-shape.json`
- Modify: `packages/shared/src/index.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces stable paged views `get_campaign`, `get_campaign_count`, `get_sponsor_campaigns`, `get_creator_campaigns`, and `get_accounting` matching `contract-shape.json`.

- [ ] **Step 1: Add randomized operation sequences that recompute active escrow from campaign records after every attempted call**
- [ ] **Step 2: Add public-schema tests proving no owner, upgrade, override, emergency-withdraw, or arbitrary-recipient method exists**
- [ ] **Step 3: Add pagination/bounds/view-shape tests and export representative JSON to `contract-shape.json`**
- [ ] **Step 4: Make shared parser tests consume the same fixture and fail on contract/frontend drift**
- [ ] **Step 5: Run `pnpm test:contract`, `pnpm test:shared`, and `pnpm lint:genvm`; repair every failure before continuing**
- [ ] **Step 6: Commit with `test: harden contract invariants and schema`**

### Task 5: Wallet, chain adapter, and transaction lifecycle

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/genlayer.ts`, `apps/web/src/lib/genlayer.test.ts`
- Create: `apps/web/src/lib/contract.ts`, `apps/web/src/lib/contract.test.ts`
- Create: `apps/web/src/lib/wallet.tsx`, `apps/web/src/lib/wallet.test.tsx`
- Create: `apps/web/src/test/setup.ts`

**Interfaces:**
- Produces `readClient()`, `writeClient(address)`, `connectWallet()`, `readCampaign(id)`, `writeAndConfirm(request, expectedReadback)`, `explorerTxUrl(hash)`, and `WalletProvider/useWallet()`.
- `writeAndConfirm` returns `{ hash, finalized: true, execution: "SUCCESS", readback }` only after all three checks pass.

- [ ] **Step 1: Write failing tests proving read-only browsing never generates/stores a private key and writes reject disconnected/wrong-network wallets**
- [ ] **Step 2: Implement separate accountless read and injected-provider write clients with account/network change reset**
- [ ] **Step 3: Write failing transaction tests for signing rejection, submitted hash, finalization timeout, execution failure, stale readback, and successful reconciliation**
- [ ] **Step 4: Implement typed read/write wrappers with strict address/ID validation and `FINALIZED` plus execution-result inspection before readback**
- [ ] **Step 5: Run adapter/wallet tests and commit with `feat: add verified GenLayer client lifecycle`**

### Task 6: Responsive campaign UI and authoritative state rendering

**Files:**
- Create: `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`
- Create: `apps/web/src/hooks/useCampaigns.ts`
- Create: `apps/web/src/components/Shell.tsx`, `TransactionStatus.tsx`, `CampaignCard.tsx`, `StateTimeline.tsx`, `EvidencePanel.tsx`, `VerdictPanel.tsx`, `EmptyState.tsx`
- Create: `apps/web/src/pages/Landing.tsx`, `Dashboard.tsx`, `CreateCampaign.tsx`, `CampaignDetail.tsx`, `NotFound.tsx`
- Create: page/component tests beside each file

**Interfaces:**
- Consumes contract adapter and shared campaign predicates.
- Produces routes `/`, `/dashboard`, `/campaigns/new`, and `/campaigns/:id`.

- [ ] **Step 1: Write failing route/page tests for disconnected, loading, empty, validation error, pending, finalized, success, readback, `UNRESOLVED`, `PASSED`, `FAILED`, `PAID`, and `REFUNDED` states**
- [ ] **Step 2: Implement the visual system: editorial campaign cards, high-contrast state color/token pairs, keyboard focus, reduced-motion support, and 360/768/1280px layouts**
- [ ] **Step 3: Implement creation with exact simulated-GEN escrow disclosure, immutable-term confirmation, and wallet gating**
- [ ] **Step 4: Implement creator accept/submit actions and permissionless resolve/settle/refund controls derived solely from contract state**
- [ ] **Step 5: Implement transaction status sequencing without optimistic advancement; invalidate and poll only until authoritative readback matches**
- [ ] **Step 6: Run all web tests and `pnpm build`; fix accessibility, type, and layout failures**
- [ ] **Step 7: Commit with `feat: build ProofOfPost campaign experience`**

### Task 7: Integration tests for promoted flows

**Files:**
- Create: `apps/web/src/test/contractHarness.ts`
- Create: `apps/web/src/integration/campaign-flow.test.tsx`
- Create: `packages/contracts/scripts/local-e2e.mjs`
- Modify: root scripts in `package.json`

**Interfaces:**
- Produces `pnpm test:integration`, which runs create → accept → submit → resolve → settle → readback and a wrong-actor/UNRESOLVED recovery branch through public adapter interfaces.

- [ ] **Step 1: Write a failing happy-path integration test that switches sponsor, creator, and unrelated resolver accounts without bypassing the adapter**
- [ ] **Step 2: Implement a deterministic contract harness that mirrors transaction finalization/execution/readback boundaries but delegates state rules to the contract test fixture or local RPC**
- [ ] **Step 3: Add a failing critical branch test for unauthorized acceptance and consensus `UNRESOLVED` followed by timeout refund**
- [ ] **Step 4: Implement the minimum harness controls for validator outcome and clock advance; do not add UI-only state shortcuts**
- [ ] **Step 5: Run integration tests twice to prove isolation/idempotence and commit with `test: cover end-to-end campaign flows`**

### Task 8: Deployment, readback, recovery, and fixed manifest tooling

**Files:**
- Create: `packages/contracts/scripts/deploy.mjs`
- Create: `packages/contracts/scripts/readback.mjs`
- Create: `packages/contracts/scripts/e2e.mjs`
- Create: `deployments/manifest.schema.json`
- Create: `docs/recovery.md`
- Modify: `.env.example`, `package.json`

**Interfaces:**
- `deploy.mjs <network>` reads `DEPLOYER_PRIVATE_KEY` only from the environment, prints deployer/network/constructor/source hash, deploys only after the external user-confirmation gate, waits for accepted/finalized status, and writes a manifest with real values.
- `readback.mjs <manifest>` verifies deployed source, schema, classification, and accounting.
- `e2e.mjs <manifest>` emits proof rows containing actor, action, method, transaction, finalization, success, and readback.

- [ ] **Step 1: Write dry-run tests for malformed/missing keys, unsupported networks, unfunded testnet wallet, absent address, failed receipt, and manifest schema validation**
- [ ] **Step 2: Implement deploy dry-run/preflight and refuse to write any manifest containing an empty or placeholder address/hash**
- [ ] **Step 3: Implement deployed-code/source-hash and schema readback checks using `getContractCode` and `getContractSchema`**
- [ ] **Step 4: Implement live happy-path and critical-error evidence collection without logging secrets**
- [ ] **Step 5: Write the intentionally-frozen migration/recovery runbook with timeout recovery, new-address migration, old-campaign completion, and rollback-by-frontend-configuration**
- [ ] **Step 6: Run all tooling in dry-run/read-only mode only; commit with `chore: add deployment and evidence tooling`**

### Task 9: Documentation, hygiene, and full local verification

**Files:**
- Create: `README.md`
- Create: `docs/proof-matrix.md`
- Modify: `.gitignore`, root scripts, any files revealed by verification

**Interfaces:**
- Produces a judge-ready local repository that remains explicitly incomplete until authorized live deployment/readback evidence is inserted.

- [ ] **Step 1: Write README sections for problem, trust model, architecture, setup, environment variables, tests, deployment, use, simulated-value warning, frozen recovery, and known limitations**
- [ ] **Step 2: Add a proof-matrix template whose live transaction/address cells say `NOT DEPLOYED — USER CONFIRMATION REQUIRED`, never a fake value**
- [ ] **Step 3: Scan tracked/untracked files and generated output for secrets, private keys, tokens, AI task files, caches, build artifacts, and local guardrail files**
- [ ] **Step 4: Run `pnpm lint:genvm`, `pnpm typecheck`, `pnpm build`, `pnpm test`, and `pnpm test:integration` from a clean dependency install**
- [ ] **Step 5: Start the local app and inspect desktop/mobile layouts, console errors, disconnected wallet, loading, `UNRESOLVED`, success, error, and readback states**
- [ ] **Step 6: Verify `git diff --check`, clean status, exact commit, and source hash; commit with `docs: prepare verified MVP handoff`**
- [ ] **Step 7: Stop and present the action-time identity report before any GitHub push, contract deployment, or Vercel deployment**

## External Completion Phase (blocked until explicit confirmation)

After local verification, inspect but do not mutate: Git author, active GitHub CLI account, intended repository owner/remote, deployment wallet address/network/balance, Vercel account/team/project, and proposed URLs. Ask the user to confirm the exact push, contract deployment, and Vercel deployment actions. Only then execute them, wait for contract finalization, verify deployed source and schema, run one successful live campaign transaction plus one critical error branch, deploy the frontend using environment-provided `VERCEL_TOKEN`, exercise the production URL, and replace the incomplete proof rows with immutable evidence.

