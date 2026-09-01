# Successor happy-path evidence design

## Goal

Provide one stable public evidence page for ProofOfPost campaign `2` on the active Studionet successor. The page enables a live creator submission and validator decision without introducing a backend or any off-chain outcome control.

## Chosen approach

Reuse the existing static evidence-page structure at a new URL, `/proofs/campaign-2.html`. Bind its visible content to:

- contract `0x26775c839ea1D22bbB30959aB3Ae8544023eF09B`;
- campaign `2`;
- sponsor `0x21b45103dd05c43969daF3CbB4277391777e2eC7`;
- creator `0x94dBCa71a30942e43B6558aA624d0D24b9C2ef46`;
- the frozen ProofOfPost workflow and explicit simulated-GEN sponsorship disclosure.

The page is passive evidence only. It cannot select a verdict, update campaign state, or move funds. The Intelligent Contract remains the sole source of truth.

## Workflow

1. Deploy the evidence page at the already-bound production origin.
2. Sponsor creates campaign `2` from the production frontend with 1 simulated GEN and freezes the page origin, creator, brief, rubric, and deadlines.
3. Bound creator accepts and submits the exact evidence URL.
4. An unrelated account triggers validator resolution.
5. If validators return `PASS`, anyone settles and the contract pays only the fixed creator. Any `FAIL` or `UNRESOLVED` result follows the contract's existing safe state machine instead of being overridden.

## Verification

- Build and existing tests must remain green.
- Production must serve the new page without client-side mock data.
- Every write must reach `FINALIZED`; execution result and authoritative readback must be recorded.
- Final custody must preserve `total_inflows = active_escrow + completed_payouts + completed_refunds` and contract balance must equal active escrow.

## Scope limits

No new React route, backend, database, contract change, admin path, or validator prompt change is included.
