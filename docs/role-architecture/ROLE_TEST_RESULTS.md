# Role Test Results — 27-Role Back Offices

**Run date:** 26 November 2026 · **Build:** v0.5.0 · **Data:** synthetic only (`zps_oms_test`, `zps_oms_e2e`, `zps_oms_dev`).

## 1. Summary

| Suite | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | Clean |
| Unit and integration (Vitest, MySQL, per-test rollback) | `npm test` | **108 passed / 108** (13 files) |
| Role suite | `tests/three-tier-roles.test.ts` | 13 passed (included in the 108) |
| Production build | `npm run build` | Succeeded |
| Route audit (production build, port 3300) | `node scripts/route-audit.mjs http://localhost:3300` | **81 routes × 54 synthetic accounts, 0 server errors** (`docs/evidence/route-audit.md`) |
| End-to-end (Playwright, Edge) | `npx playwright test` | **7 passed / 7** |
| Phone-width review (375 × 812, production build) | `npm run review:mobile -- http://localhost:3300` | **27 / 27 dashboards, 0 horizontal overflow**; screenshots and table in `docs/evidence/mobile/` |

## 2. What the role suite proves (`tests/three-tier-roles.test.ts`)

| Test | Evidence |
|---|---|
| Catalogue matrix | Exactly 27 roles numbered 1–27; tiers 1 (01–06), 2 (07–17), 3 (18–27); every role has a back office, assignable units, a workspace whose navigation entries all exist; retired codes absent from the active catalogue |
| Technical separation | The five technical roles are TECHNICAL and hold no personnel, assignment, manpower, roster, stores, request or fleet permission; only Superadmin holds `platform.configure` and `tenant.manage`; HQ Tech holds `platform.operate` |
| Role 16 | Principal Armourer holds administrative-request permissions only; firearm/ammunition/armoury/weapon are prohibited terms |
| Stores ownership | `stores.manage` held only by roles 15, 23, 27; every `stores.approve` holder is BUSINESS |
| Accounts for all 27 roles | Every role has an active synthetic account whose single-context workspace matches; no active assignment of a retired role remains |
| Headline figures | Every role gets figures; technical roles never get personnel or assignment figures |
| Tier 1 separation | Superadmin refused personnel and stores, has no approval unit; Inspector General refused personnel records but sees the national summary figure (no record link) equal to the database count |
| Context switching | Actor restricted to the selected assignment (no cross-context access); a foreign or revoked id falls back to one primary context, never to all; a session cannot select another user's assignment (refused and audited) |
| Scoped technical administration | District tech admin lists only Kitwe accounts, can issue a temporary password inside Kitwe, gets 404 for a Lusaka commander and for another technical administrator; station tech admin cannot unlock a district account and cannot read personnel; Copperbelt and Mobile Unit admins are isolated from each other; HQ Tech supports nationally |
| Stores ledger | Over-issue refused; receipt updates balance and ledger balance-after; prohibited item name refused; other division's stores officer gets 404; a commander cannot record movements |
| Requisition approval | Requester refused (separation of duties); Station Inspector refused; issue before approval refused; commander without a STORES delegation refused; with delegation approved, issued by the district stores officer, stock reduced; cross-district requisition refused |

## 3. Migrated tests (old 41-role semantics → 27 roles)

| Test | Change |
|---|---|
| TS-03 | Second staff officer now `DIVISION_STAFF_I` |
| TS-07 | The former Internal Auditor account is now Inspector General: audit evidence yes, request records no (404/403), every write refused |
| TS-09 | Self-elevation attempts use `DIG_OPERATIONS` / `FORMATION_COMMANDING_OFFICER` |
| TS-10 | "Auditor grants need an expiry" replaced by "retired roles cannot be granted and grant nothing" (the 27 roles have no time-limited role) |
| TS-14 | Unauthorised export now tried by a Section Head (the IG may export reports) |
| TS-15 | Second proposer role is `SUPERADMIN` |
| auth-scope | Catalogue test asserts 27 roles and the tier split; temporary passwords refused for a business role (HQ Tech now supports accounts); Test H uses `DEPUTY_OPS_OFFICER_DISTRICT` |
| automation-platform | Tenant provisioning refused for HQ Tech (Superadmin now holds `tenant.manage`) |
| contact | Inbox recipients are the `contact.view` holders: Superadmin ×2 and Commissioner ×2 |
| extensions | "Propose only" role is Deputy OC — District |
| migrations | Seed steps include `003_three_tier_roles` |
| personnel-assignments | Fixture role `DIVISION_STAFF_II` |
| workflows | Wrong-unit-type grant uses `OC_DISTRICT` at a formation |

## 4. Route audit highlights (stores columns)

| Account | Stores | Kitwe item | Lusaka item | Requisitions | New requisition | Kitwe requisition |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Lusaka QM Stores (15) | ✓ | 404 | ✓ | ✓ | ✕ | 404 |
| Copperbelt QM Stores (15) | ✓ | ✓ | 404 | ✓ | ✕ | ✓ |
| Kitwe District Stores (23) | ✓ | ✓ | 404 | ✓ | ✕ | ✓ |
| Kitwe Central Station Stores and Admin (27) | ✓ | 404 | 404 | ✓ | ✓ | ✓ |
| Kitwe OC District (19) | ✓ | ✓ | 404 | ✓ | ✕ | ✓ |
| District / Station system administrators (18, 24) | ✕ | 404 | 404 | ✕ | ✕ | 404 |

✓ rendered · ✕ audited access-denied page · 404 record outside scope (existence not disclosed).

## 5. Phone-width review (26 November 2026)

Every role's dashboard was captured at 375 × 812 and checked for horizontal overflow (automated) and read slice by slice (manual). Findings and fixes:

| Finding | Fix |
|---|---|
| Prototype notice wrapped to 4–5 lines on phones | Short notice on phones; role and scope stay in the dashboard heading and account menu |
| Quick actions and tasks sat below a 17-card module list | Action column comes first on phones; phones list only the modules the role can open |
| Back-office name repeated as the working-panel heading (and two panels used a second page heading) | Working panels have their own section heading |
| All tables had a 640 px minimum, so 2–3 column tables scrolled sideways | Minimum width now depends on the column count; narrow tables wrap |
| "Key activity" chart empty for stores, transport, armourer and local technical roles | Scoped activity of the role's own function (stock receipts/issues/requisitions, maintenance, own requests, sign-ins and support actions) |
| Superadmin panel still said "Platform administrators" | Wording updated |

After the fixes: 0 overflow on all 27, route audit 0 server errors, Vitest 108/108, Playwright 7/7.

## 6. Not covered by automated tests

- The context switcher's menu interaction in a browser (the server-side switching and validation are unit-tested).
