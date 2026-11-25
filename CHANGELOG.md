# Changelog

All notable changes to ZPS-OMS. Dates are Africa/Lusaka.

## [0.1.10] — 2026-11-26 — How It Works page
### Added
- How It Works page (`/how-it-works`) to the owner-approved design with the shared approved hero: five-step Operational Flow (Initiate, Review, Approve, Implement, Report & Monitor), Institutional Workflow Across Zambia (Service Headquarters, Provincial Police Divisions, Divisional Units & Formations), What ZPS-OMS Manages, and Key Benefits for Operations. Added to the public menu.

### Changed
- Public menu: Home · About · Features · Technical Team · How It Works · Contact. The full menu shows from 1280 px; narrower screens use the menu button so the header never wraps.
- Home page call-to-action image now centre-crops, ready for the armoured-vehicle photograph at `public/hero/cta-vehicle.webp`.

## [0.1.9] — 2026-11-25 — Official title
### Changed
- The national office is named "Deputy Inspector General of Police - Operations (DIG Operations)" everywhere: Service HQ record (shown on sign-in, breadcrumbs and dashboards), public pages and project documents (DEC-027).
- Migration 003 renames the Service HQ record in existing databases; migrations can now carry one-off data changes.

## [0.1.8] — 2026-11-25 — Contact page with working message form
### Added
- Contact page implemented to the owner-approved design: shared approved photo hero ("GET IN TOUCH / Contact ZPS-OMS"), Contact Information cards (phone, email, technical support, website — clickable tel/mailto/web links), Our Office, working "Send Us a Message" form, "For Faster Assistance" note and topic links (Enquiries, Support, Access, Feedback) that pre-select the form subject.
- Messages are validated on the server, stored with a reference (CON-YYYY-NNNNNN), audited, and protected by a honeypot and a per-email hourly limit (5).
- Back-office **Contact messages** inbox (`/app/messages`) for the HQ Operations Coordinator and Platform Administrator, with New/Handled filters and "Mark as handled". New permissions `contact.view`, `contact.manage`.
- Database migration 002 (`contact_messages`); existing databases upgrade automatically without re-seeding.
- 6 new tests (contact submission, validation, honeypot, rate limit, access control, v1→v2 upgrade).

### Changed
- One headquarters-photo slot (`public/brand/hq-building.webp`) now serves both the About and Contact pages.
- Our Office names the "Deputy Inspector General of Police - Operations (DIG Operations)", matching the owner's correction on the About page.

## [0.1.7] — 2026-11-25 — Technical Team page
### Added
- Technical Team page (`/technical-team`) implemented to the owner-approved design with the shared approved hero; replaces Modules in the public menu (the Modules page remains available at `/modules`).

## [0.1.6] — 2026-11-25 — Features page to the approved design
### Added
- Features page implemented to the owner-approved "ZPS-OMS Modules" design: shared approved photo hero ("SYSTEM MODULES / ZPS-OMS Modules"), nine Core System Module cards with coloured accents and icon tiles, and the "Module Access by Role" strip (Superadmin, CRM Administrator, Divisional Commander, Division Staff Ops, General User) exactly as designed.

## [0.1.5] — 2026-11-25 — About page to the approved design
### Added
- About page implemented to the owner-approved "About ZPS-OMS" design: approved photographic hero ("About the Platform"), Our Purpose with image, Our Mission and Our Vision cards, five Objectives, and five Core Values (Integrity, Service, Professionalism, Accountability, Security).
- Our Purpose names the "Deputy Inspector General of Police - Operations (DIG Operations)" (owner wording).
- Shared `PhotoHero` component (`src/components/photo-hero.tsx`) so the landing and About pages use the same approved hero.

### Notes
- The headquarters-building photograph in the design could not be extracted (the design file was not available on disk). `public/about/purpose.webp` currently holds a crop of the approved hero photography; replace it with the building photograph at the same path.

## [0.1.4] — 2026-11-25 — Footer copyright
### Added
- Footer copyright line on public pages and on every signed-in back-office page: "© <current year> Zambia Police Service. All rights reserved. Designed and developed by SPOM Technical Services Section Team." The year is rendered in the browser so pre-built pages always show the current year.

## [0.1.3] — 2026-11-25 — Landing page implemented to the approved design
### Changed
- Landing page now matches the owner-approved design in wording, figures, icon colours and composition (DEC-025): approved hero strapline and trust markers, capability card wording, "8 Integrated Operations" figure, CTA vehicle photograph and footer tagline.
- Hero photograph is a true background on screens 1024 px and wider, tuned per breakpoint so faces never sit behind text; "Illustrative imagery" label and the extra role-workspaces section removed.
- Footer rebuilt to the design (centred crest and service name); removed a sub-pixel line above the footer wave.

## [0.1.2] — 2026-11-25 — Photographic hero
### Changed
- Landing-page hero uses the owner-supplied images with a responsive layout (photo right on wide screens, stacked on tablets and phones), slow cross-fade that respects reduced motion, and an "Illustrative imagery" label (DEC-024).
- New role-based workspaces section showing the interface preview and the dashboards from the role catalogue.

## [0.1.1] — 2026-11-25 — Public site aligned to A4 reference design
### Changed
- Public header, navigation (active underline, mobile menu), landing page (hero, capabilities, figures band, call to action) and footer rebuilt after the supplied landing-page reference; secondary public pages share a navy hero with the green-white-blue wave.
- Departures from the reference (no fabricated photography/insignia, no real-time/readiness/tracking claims, labelled configured figures) recorded in `docs/UI_UX_DESIGN_SYSTEM.md`.

## [0.1.0] — 2026-11-25 — Local synthetic prototype
### Added
- Repository placed under git; Phase 1 documentation packages preserved unchanged.
- Domain core: schema v1 (22 tables), RBAC + organisational-scope policy engine, delegation-based approvals, hash-chained append-only audit, server-side sessions, synthetic seed driven through the real services.
- Modules: organisation registry with effective-dated change control; identity & access (provisioning, role + scope assignments, delegations, suspension/deactivation, access reviews); administrative request workflow (multi-level, return/resubmit, cancel, close, controlled reopen); fleet register & maintenance lifecycle with service history; general asset register with custody/transfer/inspection/disposal; reports with audited CSV export; audit explorer & evidence export; security events; platform health; in-app notifications.
- 13 role-specific dashboards including the dedicated **Division Staff Ops** workspace.
- Public pages: Landing, About, Features, Modules, Contact, Secure sign-in (synthetic role simulator).
- Tests: 34 Vitest tests incl. mandated scenarios TS-01…TS-15; route-audit script (all roles × all routes).
- Documentation set required by the master prompt (Part S) plus `PHASE2_ASSESSMENT.md` and generated permission matrix.

### Fixed during verification
- Form input no longer cleared when the server returns a validation/authorisation error.
- No page-level horizontal scrolling at 375 px width.
