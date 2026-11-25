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
