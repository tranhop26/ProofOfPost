# Architecture

ProofOfPost is a sponsored-publication escrow. A sponsor and creator cannot safely trust each other to release funds or judge whether a public post satisfies a frozen brief. GenLayer validators make that evidence decision, while the Intelligent Contract remains the sole source of campaign state and custody truth.

## Decision and on-chain effect

The contract asks validators whether the submitted HTTPS page matches the bound creator identity, publication timing, brief, rubric, origin, and sponsorship disclosure.

- `PASS` moves the campaign to `PASSED`; `settle` pays the fixed creator.
- `FAIL` moves it to `FAILED`; `refund` returns the escrow to the fixed sponsor.
- `UNRESOLVED` never defaults to either party. It permits bounded retries, then timeout recovery to `REFUNDABLE`.
- Validator consensus failure leaves the pre-call state and accounting unchanged, so the resolution can be retried.

## Components

- `packages/contracts/proof_of_post.py`: authoritative state machine, authorization, evidence rules, validator prompt, escrow accounting, fixed-recipient payout/refund, recovery, and read views.
- `packages/shared`: strict parser for contract readback and shared URL validation vectors.
- `apps/web`: responsive React client. Reads use the GenLayer public client; writes use the connected wallet and require finalized execution plus authoritative contract readback.
- `deployments`: immutable manifests containing the real network, address, transaction, deployer, classification, and source hash.

There is no application backend or database that can replace a contract decision.

## State machine

`OPEN → ACCEPTED → SUBMITTED → PASSED|FAILED|UNRESOLVED`

- `PASSED → PAID`
- `FAILED → REFUNDABLE → REFUNDED`
- expired `OPEN` or `ACCEPTED` campaigns can become `REFUNDABLE`
- bounded/expired `UNRESOLVED` campaigns can become `REFUNDABLE`

Every write checks caller authorization, current state, deadlines, and replay. Settlement and refund update accounting before a native transfer and cannot be claimed twice. The invariant is:

`total_inflows = active_escrow + completed_payouts + completed_refunds`

## Recoverability

The active contract is `INTENTIONALLY_FROZEN`: no owner, upgrader, arbitrary withdrawal, or caller-selected recipient exists. Recovery is limited to permissionless state-specific expiry, bounded `UNRESOLVED` retry/timeout, and fixed-recipient settlement/refund. A new deployment may supersede the address for new campaigns, but cannot mutate campaigns held by the frozen deployment.
