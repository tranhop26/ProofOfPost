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

Active verified Studionet successor:

- Contract: [`0x26775c839ea1D22bbB30959aB3Ae8544023eF09B`](https://explorer-studio.genlayer.com/address/0x26775c839ea1D22bbB30959aB3Ae8544023eF09B)
- Deployment transaction: [`0x3278511ea807793252203ffd0ecdf4d5e3bc429928b24b1029a0256edbcd983d`](https://explorer-studio.genlayer.com/tx/0x3278511ea807793252203ffd0ecdf4d5e3bc429928b24b1029a0256edbcd983d)
- Source hash: `sha256:9dafc26a869b8dc1e3511e5425086d7c5cf4ac43575eb98a32594b62dbe54368`
- Manifest: `deployments/studionet-0x26775c839ea1d22bbb30959ab3ae8544023ef09b.json`

The deployment reached `FINALIZED / SUCCESS / MAJORITY_AGREE`. Automated readback verified the exact source hash, all 14 schema methods, and zero initial balance. A live 1 simulated GEN self-deal regression was recorded as terminal `REFUNDED`; the child transfer returned the full value, contract balance remained zero, and accounting read back as `total_inflows = completed_refunds = 1 GEN` with no active escrow.

Deployment is intentionally guarded. First inspect the exact wallet/network/source hash without deploying:

```bash
set DEPLOYER_PRIVATE_KEY=<environment-only-key>
node packages/contracts/scripts/deploy.mjs studionet --dry-run
```

After the required action-time user confirmation, set the exact one-use confirmation value printed by the identity review and run without `--dry-run`. The script waits for finalization and writes an immutable real-value manifest. Verify deployed source and accounting with:

```bash
node packages/contracts/scripts/readback.mjs deployments/<manifest>.json
```

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

See the current [proof matrix](docs/proof-matrix.md) for the active successor regression and the preserved live happy-path evidence from the superseded deployment.
