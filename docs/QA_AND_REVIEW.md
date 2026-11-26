# UI/UX Concept v0.2 — Verification Record

## Browser smoke tests performed

Tested in headless Chromium with the local prototype source and supplied crest embedded in the page for the rendering test.

| Test | Result |
|---|---|
| Exact supplied crest loads at 339 × 197 px | PASS |
| Crest remains in the shared shell across all nine screens | PASS |
| All nine navigation routes render one page heading | PASS |
| Provincial division search returns the matching card | PASS |
| Fleet reference search returns the matching row | PASS |
| Demonstration request dialog opens | PASS |
| Escape closes dialog | PASS |
| Focus returns to the launch control after dialog close | PASS |
| Mobile navigation drawer opens and closes | PASS |
| Mobile body does not horizontally overflow at 390 px viewport | PASS |
| Browser JavaScript page errors during smoke tests | 0 |
| JavaScript syntax check (`node --check app.js`) | PASS |

## Visual artefacts

- `dashboard-preview.png` — desktop national Operations Overview.
- `mobile-preview.png` — narrow mobile layout with Fleet & Transport selected.
- `screen-gallery.png` — nine-screen overview.
- `screens/` — individual full-page screenshots for all nine screens.

## Limitations

- This is a static frontend prototype; no backend, database, API, persistence, real authentication, real access control or production audit facility exists.
- Browser smoke tests do not constitute full cross-browser, accessibility, penetration, security or user acceptance testing.
- Automated WCAG 2.0/2.1/2.2 A and AA rules (axe-core) pass on the public pages and every role's dashboard and Help page (`docs/evidence/accessibility.md`). Automated rules cover only part of WCAG: a manual audit (keyboard-only use, screen reader, content and forms) remains a required activity before roll-out.
- Reflow (SC 1.4.10) and 200 % zoom (SC 1.4.4): no page scrolls sideways at 320 px or 640 px (`docs/evidence/reflow.md`). The first run found 5 pages that did (long option labels in filter selects, a non-wrapping card header, the search bar and the technical-team cards); fixed in shared CSS and components.
- Performance baseline (NFR-002): `docs/evidence/load-test.md`. Figures are from one developer machine and are a baseline, not a capacity statement.
- The prototype was not connected to any Zambia Police Service network or system.
- Sample metrics, dates, records and references are synthetic.
- Institutional establishment and reporting relationships remain subject to internal confirmation.

## Crest integrity

The asset used is the exact user-supplied PNG. No redraw, recolour, crop or substitution is performed by this prototype. Its SHA-256 value is recorded in `ASSET_MANIFEST.txt`.
