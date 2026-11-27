# Complete Workflow Test Results — v0.9.1

Run on 27 November 2026, Windows 11, Node.js 22.23.4, XAMPP MariaDB 10.4.32, Microsoft Edge via Playwright. All data synthetic. Every figure below comes from running the command shown on the final code; nothing is inferred. (v0.9.0 results: `docs/development/END_TO_END_TEST_RESULTS.md`.)

## Summary

| Check | Command | Result |
|---|---|---|
| TypeScript (strict) | `npx tsc --noEmit` | Clean |
| ESLint (zero warnings) | `npm run lint` | Clean: 0 errors, 0 warnings |
| Domain and integration tests | `npm test` | **158 / 158 passed**, 26 files |
| Browser tests | `npm run test:e2e` | RESULT_E2E |
| Route audit | `npm run audit:routes` | RESULT_AUDIT |
| Security probes | `npm run test:security` | **14 / 14 passed** against the production build (port 3300): unauthenticated redirects, out-of-scope 404s, path-traversal and injection download probes, `/setup` closed, `/modules` redirect, escaped search, bad calendar input |
| Load and page weight (production build) | `npm run test:load` | **PASS** (provisional budgets, DEC-066): 0 server errors at 1, 10 and 25 users; back-office p95 150 / 998 / 2,766 ms; health p95 ≤ 222 ms; HTML ≤ 24.5 KB gzip (`docs/evidence/load-test.md`) |
| Production build | `npm run build` | Succeeds, 0 warnings (compiled in 22.2 s) |
| Audit chain | `npm run verify:audit` | 20,572 events, 0 content mismatches, 0 link mismatches |
| Dependency audit | `npm audit` | 0 vulnerabilities |

## Workflow lifecycles (directive §7, §11.3)

| Workflow | Steps proven | Domain tests | Browser test |
|---|---|---|---|
| Manpower request, initiation to closure | create → select organisations → requirements → submit → review/recommend → approve → contributions (validate, return, resubmit) → consolidate → close | `manpower` | roster journey |
| Automated roster compilation | retrieve existing records → duplicates, membership, eligibility, conflicting assignments → authorised adjustments → consolidated roster → versions → approve → print, PDF, CSV, .xlsx | `manpower`, `extensions` | roster journey; A4 print |
| Operational-area assignment | canonical identity → home unit → area → proposal → decision chain → commencement → disposition → history | criterion F | assignment journey |
| One-year tenure | 365-day calculation → review dates → reminders → routine early withdrawal refused → documented exceptions incl. misconduct → same-area renewal keeps commencement → new area new commencement | criteria H, I | renewal journey |
| Transfer (KCM Mine Operations, Kitwe → Mopani Mine Operations, Mufulira) | initiate → release chain → receiving acceptance → old assignment closed and new created in one transaction → both histories kept; a failure mid-acceptance changes nothing | criterion G; `transactions` | transfer journey |
| Approval | configurable chains, delegation + business role, no rank-based authority, no self-approval, no two levels by one officer, deadlines and escalation | `workflows`, `decision-chains` | route audit |
| Reporting and audit | figures equal direct SQL; exports audited; audit events carry actor, time, reference, before/after, scope and delegation reference | `reports`, `paging`, `transactions`, `audit-chain` | route audit |
| Calendar and correspondence | schedule, refuse operational text, register, assign, progress, file, documents | `scheduling-correspondence` | admin-records journey |
| Public site | navigation order, links, `/modules` redirect | — | public-site |

## Browser tests

RESULT_E2E_TABLE

## Route audit by role

Per-role counts (rendered, refused, hidden, server errors) are generated into `ALL_27_ROLES_VERIFICATION.md` and `docs/development/PERMISSION_VERIFICATION_REPORT.md` from `docs/evidence/route-audit.md`.
