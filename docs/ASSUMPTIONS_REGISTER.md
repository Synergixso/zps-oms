# Assumptions Register — ZPS-OMS

Every assumption below is **unvalidated**. Each must be confirmed, corrected or withdrawn by the named authority. Assumptions never confer authority to create a role, reporting line or data field in production.

| ID | Assumption | Basis | Impact if wrong | Validate with |
|---|---|---|---|---|
| ASM-001 | The ten Provincial Division names are as listed in the master prompt | Master prompt C2; pack v1.2 doc 02 | Seed names change (configurable; no code impact) | Establishment owner |
| ASM-002 | The eight seeded formations are DIG Ops formations | Master prompt C3 (says "examples… not a final authoritative establishment"); public DIG Ops page | Directory entries added/removed via change workflow | Signed establishment |
| ASM-003 | All formations are *administered by* Service HQ in the absence of evidence | DEC-018 | Re-parent through approved change requests | Establishment owner |
| ASM-004 | A role assignment applies to one org unit only (no inheritance to child units) | Least privilege; Part D "must not automatically access" | If commanders need inherited child scope, add explicit assignments | DIG Ops |
| ASM-005 | Only Service-HQ-held assignments can carry national coverage | Part D/K | — | DIG Ops / Security |
| ASM-006 | Division Staff Ops prepare and progress requests but do not assign or decide | Part D4 | Grant `request.assign` or a delegation if the Service decides otherwise | DIG Ops |
| ASM-007 | Commanders assign and decide; secretariat may also assign nationally | Part D2/D3 | Adjust catalogue | DIG Ops |
| ASM-008 | One approval level suffices for routine categories; administrative returns need a second HQ level | Demonstration only (DEC-008) | Definitions are versioned data | Process owners |
| ASM-009 | Maintenance needs delegated approval above a cost threshold | Part F M04 ("approval where required") | Threshold is configuration | Finance / DIG Ops |
| ASM-010 | Verification of maintenance by a different officer than the one submitting completion is required | Segregation-of-duties good practice | Remove rule if not policy | Technical Services |
| ASM-011 | Four general asset categories are acceptable as an allowlist | Part F M05 | Allowlist is data | Asset owner |
| ASM-012 | Custodian is recorded as an office/post reference, not a named person | Data minimisation | Add personal custodian only after privacy review | DPO |
| ASM-013 | 30-min idle / 8-h absolute session limits | Common government baseline | Configuration | Security |
| ASM-014 | Auditor grants are limited to 180 days | Part D9 ("time-limited") | Configuration | Internal Audit |
| ASM-015 | Africa/Lusaka time zone for display; UTC storage | PRD NFR-012 | — | Technical Services |
| ASM-016 | English (en-GB) UI | PRD NFR-012 | Localisation later | DIG Ops |
| ASM-017 | The supplied crest PNG (339×197) is the approved master artwork | Asset notes v0.2 | Replace file (same path) | ZPS PR |
| ASM-018 | Synthetic usernames prefixed `demo.` and display names containing "Demo" are sufficient to mark synthetic identities | Data rule | — | Security |
