# Beta Testing Report

Recorded 27 November 2026 for v0.9.1. Testing was done as an independent QA function would: the happy path, then negative cases, failure recovery, regression and real-browser interaction (Playwright in Microsoft Edge, and the in-app browser for exploratory checks). All data synthetic; no external system was touched. Final run results are in `COMPLETE_WORKFLOW_TEST_RESULTS.md`.

## Approach

| Activity | How | Scope |
|---|---|---|
| Role testing (§11.1) | One synthetic account per role signs in; the route audit requests every route as all 54 synthetic accounts and records rendered / refused / hidden / server error | 27 roles, 87 routes |
| Module testing (§11.2) | Domain and integration tests call every domain function directly (bypassing the UI); pages exercised by the route audit and journeys | 17 modules |
| Workflow testing (§11.3) | Playwright journeys: sign-in, isolation, assignment approval, renewal, KCM → Mopani transfer, roster accept/approve/print/export, context switching, calendar and correspondence with documents | 8 + 2 journeys |
| Negative testing (§11.4) | Domain tests and HTTP probes for every case in the directive's list | see `CYBERSECURITY_VERIFICATION.md` |
| Regression (§11.5) | The full domain suite, browser suite and route audit are re-run after every change batch; nothing is committed on a partial run | all |
| Browser testing (§11.6) | Real interaction: clicking, typing, uploading files, downloading documents, printing to PDF, resizing to phone and tablet widths, screen-reader rules (axe) | all public pages; every role's dashboard, Help and navigation pages |
| Exploratory | In-app browser sessions as Division Staff I and the auditor: registers, sorting, paging, calendar, correspondence actions, sidebar, contact form, sign-out | v0.9.1 changes |

## Defects found and resolved in this round

| # | Defect | Found by | Severity | Resolution | Regression evidence |
|---|---|---|---|---|---|
| B1 | Ten registers silently stopped at 300–500 rows | Code audit | High | Server-side pagination with true totals | `tests/paging.test.ts`; browser |
| B2 | Dashboard figures derived from capped lists (could under-count) | Code audit | High | SQL counts and filters | full suite; route audit |
| B3 | "Failed sign-ins (24 h)" counted from the latest 100 attempts | Code audit | Medium | SQL count over 24 hours | route audit |
| B4 | Audit explorer and security events limited to the latest 200 | Code audit | Medium | Paged with totals | `tests/paging.test.ts`; browser (page 3 of 14,706 events) |
| B5 | Rosters index cut off at 300 | Code audit | Low | Paged | `tests/paging.test.ts`; browser |
| B6 | Refused personnel reads not audited | New negative test | Medium | Audited with record reference | `tests/transactions.test.ts` |
| B7 | Some audit events lacked before/after values and the authorising delegation | Requirement review | Medium | Enriched | `tests/transactions.test.ts` |
| B8 | Nine React-hook violations (sidebar state in effects, chart mutation, contact form) | ESLint | Low | Rewritten without effects-driven state | lint clean; browser (sidebar collapse persisted and restored; counter) |
| B9 | No loading indicator or error boundary | Requirement review | Low | Added (the loading indicator was reworked after B11) | type check, lint, code review (the error boundary needs a server fault to appear, so it was not exercised in the browser) |
| B10 | Requests register had no user-selectable sort | UX review | Low | Sort control (updated, due date, reference) | browser |
| B11 | The route-level loading boundary added for B9 made Next.js stream every back-office page, so an out-of-scope record returned status 200 (with the correct not-found page) instead of 404 | Browser test (tenant isolation, final regression run) | Medium | Route-level `loading.tsx` removed; navigation feedback moved into the sidebar link (`useLinkStatus`), which leaves the response status untouched | tenant-isolation browser test; route audit |
| B12 | The route audit classified by status code only, so it would have recorded B11's 200 responses as rendered pages | Investigation of B11 | Medium | The audit now counts a not-found page served with status 200 as an error. The first version matched the not-found sentence that Next.js embeds in every page's data and flagged 3,392 cells; it was narrowed to the rendered heading and checked against a normal page (no match) and a not-found page (match) | route audit |

Defects from earlier rounds (v0.9.0: B-series in `docs/development/END_TO_END_TEST_RESULTS.md`, security S1–S6) remain fixed and are covered by the same suites.

## Open items

No in-scope defect is open. External items are listed in `EXECUTION_REGISTER.md` (X01–X06). Exploratory notes that are not defects: registers without user-selectable sort keep a fixed, purposeful order (documented in `ALL_17_MODULES_VERIFICATION.md`); the organisation directory and areas list are not paged because their size is bounded by the establishment.
