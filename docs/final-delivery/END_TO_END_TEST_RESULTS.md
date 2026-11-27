# End-to-End Test Results — v0.11.0

Full regression run 27–28 November 2026 on the final v0.11.0 code (31-role catalogue, restricted liaison workspaces, command hierarchy and reporting, DEC-076 appointment-only access, DEC-075 review changes). One unattended chain; every step ran and exited 0. Host: Windows 11, 4 logical CPUs, 8 GiB RAM, XAMPP MariaDB 10.4. **Synthetic data only.**

| # | Suite | Command | Result | Evidence |
|---|---|---|---|---|
| 1 | Type check | `npx tsc --noEmit` | Pass (0 errors) | — |
| 2 | Lint | `npm run lint` | Pass (0 problems) | — |
| 3 | Unit and domain tests (MySQL `zps_oms_test`) | `npm test` | **189 / 189 passed**, 30 files | includes `command` (13), `appointment-access` (6), `liaison` (race test) |
| 4 | Browser journeys (Playwright, port 3200, `zps_oms_e2e`) | `npx playwright test` | **30 / 30 passed** (27.1 min) | flows 8, command 5, liaison 5, reflow 6, accessibility 1, accessibility-modules 1, admin-records 1, csp 1, print 1, public-site 1; `docs/evidence/accessibility*.md`, `reflow.md`, `print.md` |
| 5 | Route audit (dev server, port 3100, restarted before the run) | `npm run audit:routes` | **0 server errors**; 0 not-found pages served with status 200 | `docs/evidence/route-audit.md` (110 routes × 65 accounts; 1 h 16 min) |
| 6 | Production build | `npm run build` | Pass, 0 warnings | — |
| 7 | Load baseline (production build, port 3300, 31 accounts) | `npm run test:load` | **PASS**: 0 server errors at every level | `docs/evidence/load-test.md` |
| 8 | Security probes (production build) | `npm run test:security` | **37 / 37 passed** (incl. 10 command-module probes) | probe output; `MULTI_TENANT_SECURITY_REPORT.md` |
| 9 | Audit chain verification (dev database) | `npm run verify:audit` | Pass: 27 844 events, 0 content mismatches, 0 link mismatches | — |
| 10 | Generated documents | `docs:completion`, `docs:permissions`, `docs:uat`, `docs:status` | Written: 31/31 role workspaces verified; 93 permissions × 31 roles; 31 UAT scripts | `ROLE_DASHBOARD_COMPLETION_MATRIX.md`, `PERMISSION_VERIFICATION_REPORT.md`, `docs/uat/`, `COMPLETE_ZPS_OMS_DEVELOPMENT_STATUS_REPORT.md` |

## Load baseline (excerpt)

| Concurrent users | Group | p50 ms | p95 ms | Throughput (req/s) | Server errors |
|---|---|--:|--:|--:|--:|
| 1 | app | 53 | 182 | 13.3 | 0 |
| 10 | app | 398 | 885 | 19.3 | 0 |
| 10 | health | 53 | 98 | 4.0 | 0 |
| 25 | app | 1 795 | 5 414 | 10.5 | 0 |

At 10 concurrent users the back-office p95 is within the 1 500 ms baseline target. At 25 it is not on this 4-CPU development laptop; production targets must be set from the Service's load model on the target infrastructure (NFR-002).

## Defects found during this release and fixed before the run

| Defect | Fix | Test |
|---|---|---|
| Liaison updates could overwrite a concurrent change | `guarded()` version-conditional updates on all six liaison writes | `liaison.test.ts` race test |
| Unmapped Area Commander office would have become appointment-only once its mapping was withdrawn (privilege escalation) | Eligibility made explicit (`APPOINTMENT_ONLY_ELIGIBLE`: Sergeant, Constable) | `appointment-access.test.ts` |
| `authority` column too short for `SUBSTANTIVE` | Widened to `VARCHAR(12)` before migration 014 was applied | `command.test.ts` |
| Dev server memory growth during multi-hour audits | Restart before long runs (KNOWN_ISSUES 15) | route audit completed in 1 h 16 min |

## What this run does not prove

- **Institutional validation.** The command structure, channels and office-to-role mappings are synthetic (DEC-075). The advisory review is in `docs/command-architecture/DEC-075_VALIDATION_REVIEW.md`; its §6 sign-off is blank.
- **Production security.** An independent penetration test of a production-configured deployment is still required.
- **Production performance.** These are development-host figures.
- **User acceptance.** The 31 UAT scripts are written but not yet executed by Service officers.
