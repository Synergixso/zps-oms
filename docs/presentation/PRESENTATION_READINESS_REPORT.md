# Presentation readiness report — ZPS-OMS v0.15.0

Run on 28 November 2026 on the development workstation (Windows 11, XAMPP MariaDB 10.4, Node.js 22, Microsoft Edge via Playwright). **Synthetic data only.** This report covers readiness for a controlled **presentation**; it is not a pilot or production acceptance (see `../final-delivery/PILOT_READINESS.md`).

## 1. Result

**Ready for a controlled presentation**, with the conditions in §4.

## 2. Regression gates (v0.15.0, one working tree)

| Gate | Command | Result |
|---|---|---|
| Configuration | `npm run check:config` | No errors (development) |
| Type check | `npx tsc --noEmit` | 0 errors |
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Unit and integration | `npm test` | 236 / 236 passed (38 files) |
| Browser (Playwright, all specs) | `npx playwright test` | 39 passed, 1 failed: Journey 5 exceeded its 8-minute budget under load after every step succeeded |
| Browser (portfolio journeys, re-run) | `npx playwright test e2e/portfolios.spec.ts` | 9 / 9 passed after Journey 5 was split into four stages (5a–5d), 5.5 min |
| Accessibility (axe-core, WCAG 2.2 AA) | within the Playwright run | 0 violations on every scanned page (`docs/evidence/accessibility*.md`) |
| Route audit (every account × every route) | `npm run audit:routes` | 0 server errors (`docs/evidence/route-audit.md`) |
| Production build | `npm run build` | Succeeded, 0 warnings |
| Security probes, production build | `scripts/security-probe.mjs` | 53 / 53 passed |
| Security probes, development | `scripts/security-probe.mjs` | 51 / 51 passed |
| Load test, production build | `scripts/load-test.mjs` | PASS (no server errors; p95 within the provisional budgets) |
| Audit chain | `npm run verify:audit` | Hash chain intact |

## 3. Journeys (DEMONSTRATION_RUNBOOK §4)

| # | Journey | Automated evidence |
|---|---|---|
| 1 | National executive oversight | `portfolios` Journey 1 |
| 2 | DIG Administration | `portfolios` Journey 2 |
| 3 | DIG Operations | `portfolios` Journey 3 |
| 4 | Special Duties coordination | `portfolios` Journey 4 (protection and movement terms refused; the third DIG gets 404) |
| 5 | Training coordination | `portfolios` Journeys 5a–5d |
| 6 | Kamfinsa Mobile Unit command | `command`, `field-command` specs |
| 7 | Parallel reporting | `command` spec; `command` unit tests |
| 8 | Administrative approvals | `flows` spec |
| 9 | Management reporting and exports | `flows`, `print` specs |
| 10 | Security and access control | `portfolios` Journey 2 (refusal), security probes, route audit |

## 4. Conditions

1. Reset the database before each presentation (runbook §2) and warm each journey's first page: the development server compiles pages on first visit, which is the cause of the one timeout above.
2. For a long session, use the production build (`npm run build && npm start`).
3. Show only the synthetic accounts in `DEMO_ACCOUNT_MATRIX.md`. The development password appears only on the local sign-in page and is never written in documents or GitHub.
4. Items awaiting Service decisions stay open and must be presented as such: H-3 DIG Administration access to individual records (#6), DEC-075 validation (#7), official establishment data (#3, #8).
