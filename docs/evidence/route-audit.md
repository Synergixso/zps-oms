# Route audit evidence

Generated 2026-11-25T21:12:48.601Z against http://localhost:3100 with the synthetic dataset. ✓ = rendered, ✕ = access-denied page (audited), 404 = record outside scope (existence not disclosed), → = redirect, ERR = server error.

**Server errors: 0**

## Routes

- R1: `/app`
- R2: `/app/approvals`
- R3: `/app/requests`
- R4: `/app/requests/new`
- R5: `/app/requests/req_5005…`
- R6: `/app/requests/req_7b1b…`
- R7: `/app/requests/req_124e…`
- R8: `/app/requests/req_65b2…`
- R9: `/app/fleet`
- R10: `/app/fleet/new`
- R11: `/app/fleet/veh_1`
- R12: `/app/fleet/veh_7`
- R13: `/app/fleet/veh_15`
- R14: `/app/fleet/maintenance`
- R15: `/app/fleet/maintenance/new`
- R16: `/app/fleet/maintenance/mnt_9487…`
- R17: `/app/assets`
- R18: `/app/assets/new`
- R19: `/app/assets/ast_1`
- R20: `/app/assets/ast_9`
- R21: `/app/assets/ast_14`
- R22: `/app/reports`
- R23: `/app/reports/REQ_STATUS_BY_ORG`
- R24: `/app/reports/FLEET_MAINTENANCE`
- R25: `/app/reports/ASSET_ACCOUNTABILITY`
- R26: `/app/org`
- R27: `/app/org/org_taz`
- R28: `/app/org/changes`
- R29: `/app/admin/users`
- R30: `/app/admin/users/u_lsk_sops`
- R31: `/app/admin/roles`
- R32: `/app/admin/reviews`
- R33: `/app/audit`
- R34: `/app/security`
- R35: `/app/workflows`
- R36: `/app/platform`
- R37: `/app/notifications`
- R38: `/app/profile`
- R39: `/app/help`

## Matrix

| User (primary role) | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 | R28 | R29 | R30 | R31 | R32 | R33 | R34 | R35 | R36 | R37 | R38 | R39 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Demo Airport Division Admin Officer (FORMATION_ADMIN_OFFICER) | ✓ | ✓ | ✓ | ✓ | 404 | 404 | 404 | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✓ | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Asset Custodian (Lusaka) (ASSET_CUSTODIAN) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✓ | ✓ | ✓ | 404 | 404 | ✓ | 404 | 404 | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Asset Custodian (Copperbelt) (ASSET_CUSTODIAN) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✓ | ✓ | 404 | ✓ | 404 | ✓ | 404 | 404 | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Internal Auditor (INTERNAL_AUDITOR) | ✓ | ✓ | ✓ | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✓ | ✓ | ✓ | ✓ | ✕ | ✓ | ✓ | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✓ | ✕ | ✓ | ✕ | ✓ | ✕ | ✓ | ✓ | ✓ |
| Demo Copperbelt Division Commander (PROVINCIAL_COMMANDER) | ✓ | ✓ | ✓ | ✕ | 404 | ✓ | 404 | 404 | ✓ | ✕ | 404 | ✓ | 404 | ✓ | ✕ | 404 | ✓ | ✕ | 404 | ✓ | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Copperbelt Division Staff Ops (DIVISION_STAFF_OPS) | ✓ | ✓ | ✓ | ✓ | 404 | ✓ | 404 | 404 | ✓ | ✕ | 404 | ✓ | 404 | ✓ | ✓ | 404 | ✓ | ✕ | 404 | ✓ | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Central Division Commander (PROVINCIAL_COMMANDER) | ✓ | ✓ | ✓ | ✕ | 404 | 404 | 404 | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✕ | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Central Division Staff Ops (DIVISION_STAFF_OPS) | ✓ | ✓ | ✓ | ✓ | 404 | 404 | 404 | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✓ | 404 | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo DIG Ops Executive (DIG_OPS_EXECUTIVE) | ✓ | ✓ | ✓ | ✕ | 404 | 404 | 404 | ✓ | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✕ | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✕ | ✓ | ✓ | ✓ |
| Demo Fleet Officer (FLEET_OFFICER) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✓ | ✓ | ✓ | 404 | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | 404 | 404 | 404 | ✓ | 404 | ✓ | 404 | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Fleet Verification Officer (FLEET_OFFICER) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✓ | ✓ | ✓ | 404 | 404 | ✓ | ✓ | ✓ | ✕ | ✕ | 404 | 404 | 404 | ✓ | 404 | ✓ | 404 | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo HQ Operations Coordinator (HQ_OPS_COORDINATOR) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✓ | ✓ | ✓ | ✓ | ✕ | ✓ | ✓ | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✕ | ✓ | ✓ | ✓ |
| Demo Lusaka Division Commander (PROVINCIAL_COMMANDER) | ✓ | ✓ | ✓ | ✕ | ✓ | 404 | 404 | 404 | ✓ | ✕ | ✓ | 404 | 404 | ✓ | ✕ | ✓ | ✓ | ✕ | ✓ | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Lusaka Division Staff Ops (DIVISION_STAFF_OPS) | ✓ | ✓ | ✓ | ✓ | ✓ | 404 | 404 | 404 | ✓ | ✕ | ✓ | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✕ | ✓ | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Mobile Unit Admin Officer (FORMATION_ADMIN_OFFICER) | ✓ | ✓ | ✓ | ✓ | 404 | 404 | ✓ | 404 | ✓ | ✕ | 404 | 404 | ✓ | ✓ | ✓ | 404 | ✓ | ✕ | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Mobile Unit Formation Commander (FORMATION_COMMANDER) | ✓ | ✓ | ✓ | ✕ | 404 | 404 | ✓ | 404 | ✓ | ✕ | 404 | 404 | ✓ | ✓ | ✕ | 404 | ✓ | ✕ | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Organisation Registry Administrator (ORG_REGISTRY_ADMIN) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Platform Administrator (PLATFORM_ADMIN) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Demo Security Administrator (SECURITY_ADMIN) | ✓ | ✕ | ✕ | ✕ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | 404 | 404 | 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Demo Authorised Operations Staff (Central) (OPERATIONS_STAFF) | ✓ | ✓ | ✓ | ✓ | 404 | 404 | 404 | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | ✕ | 404 | ✕ | ✕ | 404 | 404 | 404 | ✕ | 404 | 404 | 404 | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
