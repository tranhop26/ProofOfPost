# Recovery runbook

ProofOfPost is `INTENTIONALLY_FROZEN`. The deployed contract has no owner, upgrader, verdict override, recipient override, or emergency withdrawal.

## Normal recovery

- An unaccepted campaign becomes refundable after `accept_by` through `expire_unaccepted`.
- An accepted campaign without evidence becomes refundable after `submit_by` through `expire_unsubmitted`.
- `UNRESOLVED` never pays either side. Judgment can be retried within the attempt/cooldown bounds.
- After attempts are exhausted or seven days pass, anyone can call `expire_unresolved`; anyone can then call `refund`, but the recipient remains the stored sponsor.
- `PASSED` and `FAILED` can be settled by anyone, but destinations remain the stored creator and sponsor respectively.

## Defect or new version

1. Stop advertising creation on the affected address; do not rewrite its state off-chain.
2. Deploy reviewed source as a new intentionally-frozen address and produce a new manifest.
3. Point a new frontend build at the new address only after deployed-code readback matches the new source hash.
4. Keep the old address visible in a legacy read-only view.
5. Existing campaigns complete or recover through the old contract's encoded paths. They cannot be migrated or administratively seized.
6. Frontend rollback means redeploying a prior verified frontend configuration; it never changes contract state.

Loss of a party's wallet cannot be repaired by an administrator. This is an explicit consequence of frozen custody and fixed recipients.
