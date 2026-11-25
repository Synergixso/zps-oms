# UI/UX Design System — ZPS-OMS (application v0.1)

Supersedes the token table in `docs/DESIGN_SYSTEM.md` (UI concept v0.2) for the application; the concept remains the visual reference.

## Branding
- **Crest:** `public/brand/zambia-police-service-crest.png`, byte-identical to `assets/zambia-police-service-crest.png` (SHA-256 `6a73b71c8a0ec8c472c1ae05bd8707fa5a4a4f6c5f087493b2489d49159a178a`). Rendered only through `<Crest>` with `object-fit: contain`, explicit 339:197 aspect, always on a white container. Never recoloured, cropped, traced or regenerated.
- **Institutional band:** `.zp-band` — 9 px: green (top 3 px), white (middle 3 px), blue (bottom 3 px), on every public and application screen. Footer swatches repeat the order.
- **Colour values are provisional** (DEC-010).

## Tokens (`src/app/globals.css`, Tailwind 4 `@theme`)
| Token | Value | Use |
|---|---|---|
| ink / ink-2 / muted | #14283F / #52667B / #5C6F83 | Text hierarchy |
| sidebar / sidebar-2 | #12283F / #1B3552 | Navigation |
| canvas / surface | #F4F6F8 / #FFFFFF | Background / cards |
| line / line-2 | #E5EAF0 / #D3DBE4 | Borders, inputs |
| zp-green / zp-green-dark | #16823B / #116A30 | Primary action, band |
| zp-blue | #133F91 | Links, band, focus ring accent |
| ok / warn / err / info (+ `-bg`) | #31744C / #8A5A14 / #B33C38 / #1F4F8F | Status text on tinted backgrounds |

Typography: system sans-serif stack (no remote fonts). Page title 22–24 px bold; card title 14 px bold; body 14 px; tables 13 px (raised from 9.5 px in the concept for legibility).

## Components (`src/components`)
`PageHeader`, `Card`, `Stat` (optionally a link), `Badge` (dot + text — status never by colour alone), `Table` (scrollable, caption, empty state), `Notice` (info/warn/err/ok, `role=alert` for errors), `DL`, `Timeline`, `Bar`, `AccessDenied`, `ButtonLink`; forms: `ActionForm` (server action, preserves input on error, field-level errors, pending state, confirmation for destructive actions), `TextField`, `TextArea`, `Select`, `Submit`, `Hidden`.

## Layout
Desktop sidebar 260 px; sticky 62 px top bar; content max 1480 px; 4/8/12/16/24 px rhythm; card radius 9 px. Below 1024 px the sidebar becomes a drawer. Grid children have `min-width: 0` so wide tables scroll inside their card; verified no page-level horizontal scroll at 375 px on the checked pages.

## A4 portrait
`@page { size: A4 portrait; margin: 15mm }`; `.print-a4` constrains public pages and reports to 180 mm; `.no-print` hides navigation and export controls. Wide operational tables are not forced into A4 on screen.

## States
Empty states explain what is absent; validation errors appear per field and in a summary; access denial is explicit and states that it was recorded; out-of-scope records return a neutral 404 (existence not disclosed); pending buttons show "Working…".

## Accessibility (WCAG 2.2 AA target)
Skip link; landmarks (`header`, `nav`, `main`, `footer`); `aria-current` on navigation; labelled inputs with `aria-invalid` + `aria-describedby`; visible `:focus-visible` outline; drawer closes on Escape; reduced-motion respected. **Not yet done:** automated axe scan, screen-reader walkthrough, 200 % zoom test (KNOWN_LIMITATIONS).

## Landing page and public chrome (v0.1.1, from the supplied A4 portrait reference)
Implemented after the reference composition: white header (crest │ "ZAMBIA POLICE SERVICE / OPERATIONS MANAGEMENT SYSTEM" / green ZPS-OMS pill, nav with green active underline, navy Login button); navy hero with eyebrow rule, large ZPS-OMS wordmark, two calls to action and four trust markers; green-white-blue wave divider (`<Wave>`, order preserved — never rotated); "Key System Capabilities" with eight cards; navy figures band; call-to-action panel; navy footer with crest and letter-spaced service name. Secondary public pages use the same navy `<PublicHero>`.

**Deliberate departures from the reference (and why)**

| Reference element | Implemented instead | Reason |
|---|---|---|
| Photographs of uniformed officers, flags, building, vehicles | **Superseded in v0.1.2:** the owner-supplied hero images are used (DEC-024), labelled "Illustrative imagery" | Owner instruction; publication approval still required |
| Trust markers "Real-time", "Integrated" | "Secure", "Role-based", "Auditable", "Centralised" | No real-time operational data and no integrations exist (L5) |
| "monitor operations, tasks and readiness in real time" | Administrative requests, approvals and outstanding actions | Readiness/tactical status is excluded (E1) |
| "Track vehicles, utilisation" | Vehicle register, licence/insurance/service dates — administrative only | Tracking/utilisation excluded (M04) |
| "8 Integrated Operations" figure | "13 Role-specific Workspaces" (count of the role catalogue) | Would be a fabricated statistic |
| Figures shown without context | Each figure labelled as configured/provisional, plus a note that they are not operational data | I3 "no fake operational statistics" |
| Multi-colour icon tiles (green, blue, purple, orange) | Green and blue tiles only | I3 "avoid random colourful icons" |
| Footer tagline "…Readiness • Accountability" | "Operations · Coordination · Accountability" | Readiness excluded |
| "restoring operational efficiency" | "supporting coordination, resource accountability and management reporting" | Avoid implying unverified current-state problems (PRD §4) |

Approved photography can be added later in the hero's right-hand column once supplied with usage rights (DEC-010).

### Hero photography (v0.1.2)
- Files: ,  (1774×887 WebP, ~250 KB, supplied by the project owner). Rendered unmodified with .
- ≥1280 px: photo occupies the right 78% at its natural 2:1 shape; left edge and bottom-left fade into the navy panel so the text column sits on solid navy. The photo's own green-white-blue wave forms the hero's lower edge.
- <1280 px: text on navy, photo below it (4:3 on phones, 2:1 from 640 px), so text never covers faces.
- The two images cross-fade over 18 s (CSS only). With , only the first image is shown.
- "Illustrative imagery" label top-right; images are decorative (), the hero is labelled by its heading.
- Role-workspaces section (between capabilities and figures) carries the illustrative interface preview and lists dashboards from the enforced role catalogue.
