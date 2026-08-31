# Proof matrix

Live cells remain incomplete until the required identity checks and action-time confirmations are complete.

| Actor | Action | Contract method | Transaction hash | FINALIZED / SUCCESS | Readback | Source/test |
|---|---|---|---|---|---|---|
| Sponsor | Create and fund campaign | `create_campaign` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `OPEN` | `test_lifecycle.py`, `campaign-flow.test.ts` |
| Creator | Accept frozen terms | `accept_campaign` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `ACCEPTED` | `test_lifecycle.py`, `campaign-flow.test.ts` |
| Creator | Bind public evidence | `submit_evidence` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `SUBMITTED` | `test_evidence.py`, `campaign-flow.test.ts` |
| Unrelated resolver | Resolve evidence | `resolve_campaign` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `PASSED`, `FAILED`, or `UNRESOLVED` | `test_judgment.py`, `campaign-flow.test.ts` |
| Anyone | Pay fixed creator | `settle` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `PAID` | `test_custody.py`, `campaign-flow.test.ts` |
| Anyone | Recover unresolved escrow | `expire_unresolved` → `refund` | NOT DEPLOYED — USER CONFIRMATION REQUIRED | Not available | Expected `REFUNDED` | `test_judgment.py`, `campaign-flow.test.ts` |
