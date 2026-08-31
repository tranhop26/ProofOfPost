# ProofOfPost

Sponsored-content escrow settled by GenLayer validator consensus.

A sponsor locks simulated GEN before work begins. A named creator accepts an immutable brief, publishes at a bound public origin, and submits one evidence URL. The Intelligent Contract asks validators whether identity, timing, required content, and sponsorship disclosure all match. `PASS` reserves payout for the creator, `FAIL` reserves refund for the sponsor, and `UNRESOLVED` holds funds safely for bounded retry or timeout recovery.

> Studionet GEN is simulated development value, not real money.

## Architecture

- `packages/contracts/proof_of_post.py` — authoritative state machine, judgment, custody, settlement, and views.
- `packages/shared` — strict contract-view parser and shared URL vectors.
- `apps/web` — responsive React/Vite UI using accountless reads and wallet-signed writes.
- No backend or database controls campaign state.

The contract is `INTENTIONALLY_FROZEN`. There is no owner override, upgrader, arbitrary withdrawal, or caller-selected recipient. See [recovery](docs/recovery.md).

## Install and run

Requirements: Node.js 18+, pnpm 10, Python 3.12+, pytest, and `genvm-lint`.

```bash
pnpm install --frozen-lockfile
copy .env.example .env
pnpm dev
```

Environment variables:

| Variable | Purpose |
|---|---|
| `VITE_GENLAYER_NETWORK` | `studionet` or `testnet-asimov` |
| `VITE_PROOF_OF_POST_ADDRESS` | Real deployed contract address; empty builds show a configuration state, never mock campaigns |
| `DEPLOYER_PRIVATE_KEY` | Deployment only; required from environment and never given a fallback |

## Verification

```bash
pnpm lint:genvm
pnpm typecheck
pnpm build
pnpm test
pnpm test:integration
```

Direct tests cover authorization, invalid transitions, replay, malformed/stale evidence, SSRF-style URLs, semantic consensus, `UNRESOLVED`, retry bounds, timeout recovery, fixed recipients, double settlement/refund, and conservation:

`total inflows = active escrow + completed payouts + completed refunds`

## Deployment

Deployment is intentionally guarded. First inspect the exact wallet/network/source hash without deploying:

```bash
set DEPLOYER_PRIVATE_KEY=<environment-only-key>
node packages/contracts/scripts/deploy.mjs studionet --dry-run
```

After the required action-time user confirmation, set the exact one-use confirmation value printed by the identity review and run without `--dry-run`. The script waits for finalization and writes an immutable real-value manifest. Verify deployed source and accounting with:

```bash
node packages/contracts/scripts/readback.mjs deployments/<manifest>.json
```

No real address or transaction is documented until deployment and readback actually happen.

## Use

1. Sponsor connects a wallet, creates a campaign, freezes the creator/origin/brief/rubric/deadlines, and funds escrow.
2. The bound creator accepts and submits one public HTTPS evidence URL.
3. Anyone triggers validator consensus.
4. Anyone settles, but the contract chooses the fixed creator or sponsor recipient.
5. On consensus failure, no favorable default occurs; retry or the encoded timeout/refund path is used.

The UI distinguishes disconnected, signing, pending, `FINALIZED`, execution `SUCCESS`, authoritative readback, `UNRESOLVED`, validation error, execution error, `PAID`, and `REFUNDED`.

## Known limitations

- Public-handle control is not cryptographically proven; validators judge readable content and the bound handle/origin.
- Evidence is text-first and a source can change after judgment. The submitted URL and binding digest remain on-chain.
- Shared validator misinterpretation remains possible; consensus primarily addresses unilateral decision control and disagreement.
- Studionet does not represent production custody or real monetary value.
- A frozen deployment cannot repair lost wallets or migrate open campaigns administratively.

See the current [proof matrix](docs/proof-matrix.md). Live evidence remains explicitly incomplete until authorized deployment.
