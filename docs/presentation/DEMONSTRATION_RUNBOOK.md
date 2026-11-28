# Demonstration runbook

For a controlled presentation of ZPS-OMS to Zambia Police Service leadership. **Synthetic data only.** A presentation is not a pilot or production deployment and needs no institutional authorisation beyond the meeting itself; real personnel or operational information must never be shown.

## 1. Environment
- Windows host with XAMPP (MariaDB 10.4 running), Node.js 22.13+, Microsoft Edge.
- Repository at the release tag; `npm ci`; `.env.local` with `DATABASE_URL=mysql://root@127.0.0.1:3306/zps_oms_dev` (local only).
- `npm run check:config` must report no ERROR.
- Projector at 1366 × 768 or larger; browser zoom 100 %. Close other applications (the development server is memory-hungry, KNOWN_ISSUES 15).

## 2. Reset to a clean demonstration database (before each presentation)
1. Stop the application.
2. `npm run db:reset` — drops and recreates **only** `zps_oms_*` databases and refuses without `--confirm-synthetic` (built into the script).
3. `npm run dev` and open `http://localhost:3100/` — the first request applies all migrations and seed steps (about 30 s); the log shows `Loaded synthetic seed steps: …`.
4. Verify: `GET /api/health` returns 200; sign in as `demo.hq.readonly` and see the National Command Overview.
5. Warm the pages: open each journey's first page once (the development server compiles on first visit).

Restoring after the presentation: repeat the reset. Nothing done during a demonstration persists beyond it.

## 3. Sign-in
The account list and the development password are shown on the local sign-in page (development build only). Use the accounts in `DEMO_ACCOUNT_MATRIX.md`. Sign out (user menu → Sign out) between profiles.

## 4. Journeys
| # | Journey | Account(s) | Steps | Expected outcome |
|---|---|---|---|---|
| 1 | National executive oversight | `demo.hq.readonly` | Dashboard → portfolio panel → Inter-office coordination → open a request | IG sees all three portfolios side by side, every coordination request (oversight), national command overview; IG has no superior |
| 2 | DIG Administration | `demo.dig.admin` | Dashboard (training, workforce strength by Division) → Training → Needs (decide one) → Nominations (approve a recommended one) → Catalogue | Service-wide training administered by the office; workforce as counts only; no individual Operations records |
| 3 | DIG Operations | `demo.dig.exec` | Dashboard → Operations administration → open the illegal-mining record (history, resource request) → Mining security services → agreement (officers assigned vs required, service report) | Nationwide administrative oversight; no tactical data anywhere |
| 4 | Special Duties coordination | `demo.dig.exec` then `demo.dig.specialduties` | Coordination → new PERSONNEL_SUPPORT request to DIG Special Duties → sign in as DIG Special Duties → acknowledge → confirm completion | One restricted record; only the receiver acts; DIG Administration cannot open it; typing "motorcade route" is refused |
| 5 | Training coordination | `demo.cb.staffops` → `demo.cb.commander` → `demo.dig.admin` → `demo.mu.commander` | Open the SPOM session → nominate an officer → recommend → approve → (SPOM) mark attending → record completion with certificate | Each step by the right office; SPOM delivers without becoming subordinate to DIG Administration |
| 6 | Kamfinsa Mobile Unit command | `demo.mu.hqcoy.commander`, `demo.mu.hq5.commander`, `demo.mu.acoy.commander`, `demo.mu.plt.commander` | Company command (HQ 5 Detachment, Kitwe) → issue an instruction to HQ 5 → Detachment Commander acknowledges and reports → Platoon command (record attendance) → Area command (counts only) | Downward instructions, upward reports, distinct Area / Platoon workspaces |
| 7 | Parallel reporting | `demo.mu.acoy.commander` → `demo.kitwe.ops`, `demo.kitwe.commander`, `demo.mu.staff2` | New status report → submit → each recipient acknowledges its own copy → Staff II reviews and forwards | One report, three recipient rows (Staff II primary; District Operations Officer and OC parallel) |
| 8 | Administrative approvals | `demo.lsk.staffops` → `demo.lsk.commander` | New administrative request → submit → approve (or reject with reason) → complete | Delegation-based approval with history and audit |
| 9 | Management reporting | `demo.hq.coord` | Reports → run a report with filters → export CSV / XLSX / PDF → Audit search for the export | Exports limited to approved columns in scope; each export audited |
| 10 | Security and access control | `demo.lsk.staffops`, `demo.dig.admin`, `demo.cb.tech` | Open a Copperbelt record by its address (neutral not-found); DIG Administration opens Operations administration (not authorised); technical administrator opens training (not authorised) | Server-side refusals, recorded in the security log |

## 5. Fallbacks
- A page is slow on first open: wait; it is compiling (development mode). For long sessions use a production build (`npm run build && npm start`, with `ZPS_INSECURE_COOKIE=1` for plain-HTTP localhost only).
- A step was taken out of order: continue with the next record (the seed contains several in each state) or reset (§2) during a break.
- The database is unavailable: start MySQL in XAMPP; `GET /api/health` reports `down` until it answers.

## 6. Automated rehearsal
`npm run test:e2e` runs the browser journeys (Playwright, Edge) against a fresh database; the presentation journeys are covered by `e2e/command.spec.ts`, `e2e/field-command.spec.ts`, `e2e/portfolios.spec.ts`, `e2e/flows.spec.ts` and the accessibility suites. Results are recorded in `PRESENTATION_READINESS_REPORT.md`.
