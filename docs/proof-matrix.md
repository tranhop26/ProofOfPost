# Proof matrix

Contract deployment is fixed and verified. Campaign rows remain incomplete until the required actor wallets and public evidence are exercised live.

| Actor | Action | Contract method | Transaction hash | FINALIZED / SUCCESS | Readback | Source/test |
|---|---|---|---|---|---|---|
| Deployer `0x21b4…2eC7` | Deploy frozen source | constructor | [`0xb4c1…f6de`](https://explorer-studio.genlayer.com/tx/0xb4c17fbf48a60615c73c7caef4378c068f973d7362c04601e98c90edad85f6de) | `FINALIZED` / `SUCCESS` | [Source/schema/accounting verified](https://explorer-studio.genlayer.com/address/0x8197823FC3D2fd6654ED6E70ab34C849Ca498477) | `readback.mjs`, deployment manifest |
| Sponsor | Create and fund campaign | `create_campaign` | NOT YET EXERCISED | Not available | Expected `OPEN` | `test_lifecycle.py`, `campaign-flow.test.ts` |
| Creator | Accept frozen terms | `accept_campaign` | NOT YET EXERCISED | Not available | Expected `ACCEPTED` | `test_lifecycle.py`, `campaign-flow.test.ts` |
| Creator | Bind public evidence | `submit_evidence` | NOT YET EXERCISED | Not available | Expected `SUBMITTED` | `test_evidence.py`, `campaign-flow.test.ts` |
| Unrelated resolver | Resolve evidence | `resolve_campaign` | NOT YET EXERCISED | Not available | Expected `PASSED`, `FAILED`, or `UNRESOLVED` | `test_judgment.py`, `campaign-flow.test.ts` |
| Anyone | Pay fixed creator | `settle` | NOT YET EXERCISED | Not available | Expected `PAID` | `test_custody.py`, `campaign-flow.test.ts` |
| Anyone | Recover unresolved escrow | `expire_unresolved` → `refund` | NOT YET EXERCISED | Not available | Expected `REFUNDED` | `test_judgment.py`, `campaign-flow.test.ts` |
