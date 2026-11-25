# Testing Strategy — ZPS-OMS

Rule: a test is reported as passed only with execution evidence. Results below were produced on 25 Nov 2026 on the local machine (Node 22.23.4, Windows 11).

## 1. Layers

| Layer | Tool | Location | Status |
|---|---|---|---|
| Domain unit + integration (real SQLite, in-memory, seeded through the real services) | Vitest 5 | `tests/*.test.ts` | **34 tests, all passing** |
| Role-based permission & cross-organisation negative tests | Vitest | `tests/access-control.test.ts` (TS-01…TS-15) | Passing |
| Workflow transition tests | Vitest | `tests/workflows.test.ts` | Passing |
| Database migration tests | Vitest | `tests/migrations.test.ts` | Passing |
| HTTP route audit — every route × every synthetic user against the running server | Node script | `scripts/route-audit.mjs` → `docs/evidence/route-audit.md` | **20 users × 39 routes, 0 server errors** |
| Export / CSRF / field allowlist over HTTP | Node script (manual run) | see PHASE_COMPLETION_REPORT §3 | Passing |
| Type checking | `tsc --noEmit` | — | Clean |
| Production build | `next build` | — | Succeeds (40 routes) |
| Dependency vulnerability check | `npm audit` | — | 0 vulnerabilities |
| Manual browser checks (built-in browser) | — | sign-in, dashboard, approve, create/submit with validation, 404 on out-of-scope URLs, mobile 375 px overflow | Done for listed flows |
| Browser E2E automation (Playwright) | — | — | **Not implemented** (needs browser-binary download; decision pending) |
| Automated accessibility (axe) | — | — | **Not implemented** |
| Performance / load (synthetic) | — | — | **Not implemented** |
| Backup & recovery | — | — | **Not applicable yet** (no backup design approved) |

## 2. Mandated scenarios (master prompt Part Q)
| # | Scenario | Test |
|---|---|---|
| 1 | DIG Ops views national summaries | TS-01 |
| 2 | Provincial Commander denied other province | TS-02 (+ route audit) |
| 3 | Division Staff Ops cannot approve without delegation | TS-03 |
| 4 | Formation isolation | TS-04 |
| 5 | Fleet Officer no personnel access | TS-05 |
| 6 | Asset Custodian no fleet administration | TS-06 |
| 7 | Auditor read-only | TS-07 |
| 8 | Platform Admin no business access | TS-08 |
| 9 | No self-elevation | TS-09 (2 tests) |
| 10 | Expiry/revocation removes access | TS-10 (3 tests) |
| 11 | Approval sequence cannot be bypassed | TS-11 (2 tests) |
| 12 | Closed requests not silently editable | TS-12 |
| 13 | Audit immutable | TS-13 |
| 14 | No unauthorised export fields | TS-14 (+ HTTP check) |
| 15 | Org changes preserve history, grant nothing | TS-15 (2 tests) |

## 3. How to run
```
npm test                 # domain, permission, workflow, migration tests
npx tsc --noEmit         # types
npm run build            # production build
npm run dev              # then, in another terminal:
npm run audit:routes     # all roles × all routes → docs/evidence/route-audit.md
```

## 4. Test data
Only the synthetic seed (`src/server/db/seed.ts`). Tests use a fresh in-memory database per test; the clock is injectable (`setClock`) for expiry and session tests.

## 5. Gaps to close next
Playwright E2E for the 19 workflows through the UI; axe-core scan of every route; 200 % zoom and keyboard-only walkthrough; synthetic load test (e.g. 10k requests) for list/report p95; CI pipeline running all of the above.
