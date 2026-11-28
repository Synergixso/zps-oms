# Manual assistive-technology audit — plan and record sheet (issue #15, X-04)

Automated WCAG 2.2 A/AA checks (axe-core) run on every role's dashboard and on the module, command, liaison and field-command pages (`docs/evidence/accessibility*.md`, 0 violations at v0.13.0), plus reflow 320–1024 px and 200 % zoom. **Automated checks do not establish conformance.** No manual screen-reader audit has been performed; this sheet is for the qualified reviewers who will do it.

## Scope (journeys)
1. Sign in, change password, sign out.
2. Dashboard and navigation for: Inspector General, DIG Operations, Division Staff I, Company Commander, Section Head (Platoon Commander), a Police Intelligence Officer (liaison).
3. Register a personnel record; validate and import a CSV (`/app/import`).
4. Issue a directive, acknowledge it, submit a report, acknowledge it as a parallel recipient.
5. Platoon attendance: record and correct a day (`/app/command/platoon`).
6. Area command: read the attendance counts table; record an engagement.
7. Calendar and correspondence register; download a report (CSV/XLSX/PDF).

## Method
- Screen readers: NVDA (latest) with Firefox and Edge; JAWS (if licensed) with Chrome; Narrator with Edge. Keyboard only (no mouse). Windows high-contrast mode. 200 % and 400 % zoom.
- For each journey: can it be completed; are headings, landmarks, table captions and form labels announced; are errors announced and associated with fields; is focus visible and in a logical order; are status messages announced (role=status / alert).

## Record sheet
| Journey | Assistive technology / browser | Completed? | Issues (WCAG criterion, severity) | Reviewer, date |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |

Acceptance (#15): every journey completed with each listed technology; every issue fixed and retested; result recorded here and X-04 set to verified.
