# ProofOfPost MVP Design

## Objective and scope

ProofOfPost is a GenLayer escrow for a single sponsored-content campaign. A sponsor locks simulated GEN, a named creator accepts immutable terms, and GenLayer validators decide whether one public evidence URL proves that the promised content was published by the bound creator, on time, and in accordance with the campaign rubric.

The MVP supports one sponsor, one creator, one evidence submission, bounded judgment retries, permissionless settlement, and timeout recovery. It does not provide creator discovery, messaging, multiple milestones, fiat payments, private social-network APIs, appeals, or production-money claims.

## Why GenLayer

The sponsor and creator have opposed financial incentives. A deterministic contract cannot interpret a natural-language brief against a public post, while an LLM controlled by either party is not a neutral decision-maker. The Intelligent Contract therefore stores the agreement and escrow, invokes validator consensus to interpret the evidence, writes the final verdict, and controls the resulting payout or refund.

### Decision statement

GenLayer establishes whether the content readable at the campaign's submitted public URL was published by the bound creator and satisfies the frozen campaign rubric within the allowed time window.

### Consequence statement

- `PASS` reserves the escrow for the creator and enables permissionless settlement to the creator address.
- `FAIL` reserves the escrow for the sponsor and enables permissionless refund to the sponsor address.
- `UNRESOLVED` leaves the escrow locked without favoring either party and permits a bounded retry or timeout recovery.

The caller, sponsor, creator, frontend, and any backend cannot choose the verdict or redirect settlement.

## Trust model

| Actor | Cannot trust | Manipulation capability | Contract defense | Test/evidence |
|---|---|---|---|---|
| Sponsor | Creator | Submit unrelated, late, mutable, or injected content | Frozen handle/origin/rubric, URL validation, evidence binding, validator consensus | Wrong origin, handle mismatch, stale evidence, injection vectors |
| Creator | Sponsor | Rewrite requirements, refuse payment, reclaim funded escrow | Terms freeze on publication; escrow is contract-custodied; sponsor cannot choose verdict | Mutation rejection, unauthorized refund, happy-path payout |
| Sponsor | Creator | Replay evidence from another campaign | Chain/contract/campaign/attempt replay domain and per-campaign submission lock | Cross-campaign replay and duplicate submission tests |
| Both parties | Resolver caller | Trigger or redirect a favorable settlement | Resolution/settlement may be permissionless, but outcome and recipient are stored by the contract | Unrelated caller settlement; recipient invariant |
| Both parties | Validator consensus | Malformed output or disagreement | Parse strictly and fail closed to `UNRESOLVED` | Malformed, contradictory, and consensus-failure tests |

## Evidence model

Each campaign binds:

- source provenance: an exact allowed HTTPS origin stored before acceptance;
- subject: campaign ID and frozen campaign title;
- issuer identity: creator wallet plus exact public creator handle;
- content version: immutable brief/rubric version `1` for the MVP;
- time: creation, funding, acceptance, deadline, submission, observation, and judgment timestamps;
- freshness: submission must occur after acceptance and no later than the campaign deadline; the claimed publication timestamp must be within the same window;
- replay domain: chain ID, deployed contract address, campaign ID, evidence digest, and judgment attempt;
- integrity: canonical URL and a deterministic digest over the evidence-binding fields;
- failures: unavailable, malformed, contradictory, stale, identity-mismatched, or insufficient evidence never becomes `PASS` or an automatic favorable refund.

Only public, credential-free, default-port HTTPS URLs are accepted. Loopback, private, link-local, metadata, ambiguous numeric hosts, fragments, and userinfo are rejected. The fetched page is untrusted content: delimiter tokens are stripped and all content is fenced in the validator prompt.

The MVP verifies what validators can read at the bound public source; it does not claim cryptographic proof that a human controls an off-chain handle.

## Domain model

The contract stores a `Campaign` record keyed by monotonically increasing ID and sponsor/creator indexes for dashboard reads.

Important fields are sponsor, creator, amount, allowed origin, creator handle, title, brief, rubric, timestamps, canonical evidence URL, evidence digest, judgment attempts, verdict, reason, state, and settlement transaction state.

No off-chain database advances workflow state. The frontend derives all advertised campaign state from contract reads.

## State machine

| From | Actor | Method | Preconditions | On-chain effect | To | Replay behavior |
|---|---|---|---|---|---|---|
| none | sponsor | `create_campaign(...)` payable | Valid fields, creator differs, positive value | Stores frozen offer and reserves escrow | `OPEN` | Creates a new ID only once per transaction |
| `OPEN` | creator | `accept_campaign(id)` | Before acceptance deadline | Records acceptance time | `ACCEPTED` | Reject |
| `OPEN` | anyone | `expire_unaccepted(id)` | Acceptance deadline passed | Selects sponsor refund | `REFUNDABLE` | Reject after transition |
| `ACCEPTED` | creator | `submit_evidence(id, url, published_at)` | Before campaign deadline; URL and time bound | Stores canonical evidence/digest | `SUBMITTED` | Duplicate rejected |
| `ACCEPTED` | anyone | `expire_unsubmitted(id)` | Campaign deadline passed | Selects sponsor refund | `REFUNDABLE` | Reject after transition |
| `SUBMITTED` or `UNRESOLVED` | anyone | `resolve_campaign(id)` | Retry cooldown and attempt limit | Validator result becomes `PASSED`, `FAILED`, or `UNRESOLVED` | terminal verdict or `UNRESOLVED` | Terminal verdict rejected; attempt counted once |
| `UNRESOLVED` | anyone | `expire_unresolved(id)` | Recovery timeout passed or attempts exhausted | Selects sponsor refund without changing verdict evidence | `REFUNDABLE` | Reject after transition |
| `PASSED` | anyone | `settle(id)` | Not previously settled | Effects before transfer; pays stored creator | `PAID` | Double settlement rejected |
| `FAILED` or `REFUNDABLE` | anyone | `refund(id)` | Not previously settled | Effects before transfer; pays stored sponsor | `REFUNDED` | Double refund rejected |

`PASSED`, `FAILED`, `PAID`, and `REFUNDED` are terminal for judgment. `UNRESOLVED` is safe and non-favorable: funds remain reserved until retry or the predeclared recovery timeout.

## Judgment design

The Intelligent Contract fetches the submitted URL with GenLayer nondeterministic web access and asks validators for a strict semantic verdict containing `outcome`, `reason`, and normalized checks for creator identity, timing, required content, and disclosure.

Validator equivalence compares the material decision, not formatting: `outcome` must match exactly and every required boolean check must match. Free-text reasons may differ. A parse failure or lack of comparative agreement results in `UNRESOLVED`.

The deterministic application layer clamps the result to the strict enum, stores the attempt and verdict before any later settlement, and never accepts a validator-selected recipient or amount.

## Custody and accounting

The campaign amount is the exact value received by `create_campaign`. Each campaign can be settled once.

Accounting counters track total inflows, active escrow, completed payouts, and completed refunds. After every state-changing path:

`total_inflows = active_escrow + completed_payouts + completed_refunds`

State changes occur before value-transfer messages. Tests cover unauthorized withdrawal, recipient substitution, double payout, double refund, payout-after-refund, refund-after-payout, replay, timeout refunds, and conservation after adversarial operation sequences.

Studionet balances are simulated GEN and will be labelled as such throughout the UI and README.

## Recoverability classification

The contract is `INTENTIONALLY_FROZEN`.

There is no owner override, upgrade method, arbitrary withdrawal, or privileged verdict path. Recovery is limited to predeclared permissionless timeout/refund transitions. A defect requires deploying a new version; open campaigns remain governed by the old address until their normal settlement or recovery path completes. The deployment manifest records source hash, constructor arguments, network, address, deployment transaction, classification, and previous-version address when applicable.

Tests prove that privileged upgrade and withdrawal methods do not exist in the public contract schema.

## Repository and components

```text
apps/web/                 responsive React + Vite application
packages/contracts/      Intelligent Contract, direct tests, deploy/e2e scripts
packages/shared/         contract types, parsers, URL/state test vectors
deployments/             immutable deployment manifests
docs/                    concise architecture, recovery, and proof material
```

The structure follows the useful separation in BrickProof without copying its warranty domain, records, methods, visual identity, or wording.

## Frontend workflow

The application has campaign creation, creator action, campaign detail, and address-scoped dashboard views. A read-only client never creates a local key. Writes require an explicitly connected wallet and the configured GenLayer network.

The UI distinguishes:

- wallet unavailable and wallet disconnected;
- signing request;
- submitted transaction pending finalization;
- `FINALIZED` transaction;
- execution `SUCCESS`;
- authoritative contract readback;
- `UNRESOLVED` with retry/recovery timing;
- validation, wallet, consensus, execution, and readback errors;
- `PAID` and `REFUNDED` terminal states.

The frontend never shows optimistic workflow state as authoritative. After each transaction it waits, checks execution success, invalidates cached reads, and confirms the expected contract state by readback. Retries and refresh reconciliation are idempotent.

## Test strategy

Direct contract tests run the real contract module against a minimal GenVM test stub with programmable validator and transfer hooks. They cover every public method, authorization, invalid transitions, bounds, URL rules, replay, malformed evidence, stale evidence, consensus failure, `UNRESOLVED`, cooldown/attempt limits, timeout recovery, recipient correctness, double execution, and conservation.

Shared tests keep contract view shapes and frontend parsers aligned. Web tests mock only the chain adapter and exercise wallet, transaction lifecycle, error, readback, and responsive state rendering. Integration tests drive the main frontend service layer through a deployed contract or deterministic local harness for create, accept, submit, resolve, settle, and one critical error path.

Before delivery, lint, typecheck, build, all direct tests, all web/shared tests, integration tests, secret scanning, and repository-hygiene checks must pass.

## Deployment and evidence gates

Contract deployment, GitHub push, and Vercel deployment each require an action-time identity check and user confirmation. Before those actions, verify Git author, GitHub CLI account, repository owner/remote, deployment wallet, Vercel team/project, and the exact proposed action.

Completion requires the exact Git commit and source hash, contract address and deployment transaction, explorer link, Vercel URL, successful and failed live transaction evidence, contract readback, test/build/lint results, known limitations, and an actor-to-method proof matrix.

