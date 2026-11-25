# Claude Code Project Instructions — ZPS-OMS UI/UX Concept v0.2

## Purpose
Refine and translate this static UI/UX concept into the ZPS-OMS frontend only when explicitly instructed. It is a design reference and synthetic-data demonstration, not an authorised police information system.

## Mandatory institutional scope
- Service Headquarters / Office of the Deputy Inspector General – Operations.
- Ten Provincial Police Divisions.
- Authorised Divisional Units and formations included in the approved DIG Operations establishment.
- Do not expand the product to districts, stations, posts, police training administration or general Service-wide HR/payroll without an approved change request.
- Treat public-source unit names and reporting relationships as provisional until validated against the current approved internal establishment.

## Branding requirements
- Use `assets/zambia-police-service-crest.png` exactly as supplied.
- Do not redraw, regenerate, vectorise, recolour, crop, alter, trace or substitute the crest.
- Preserve its aspect ratio with `object-fit: contain`.
- Display the institutional colour sequence green (top), white (middle), blue (bottom) in the narrow top band. Do not invent an official hex standard; current hex values are provisional design tokens.
- Do not create unofficial additional Police insignia, medals, badges, flags or uniform graphics.

## Visual quality
- Maintain a formal, restrained government-enterprise design.
- Prioritise hierarchy, legibility, consistent spacing, meaningful table density, accessible contrast and predictable interaction patterns.
- Avoid decorative gradients, oversized cards, excessive colour, novelty typography, random iconography, fake command-centre visuals and unnecessary animation.
- Use the established design tokens in `docs/DESIGN_SYSTEM.md`.
- Keep all nine screens consistent with the shared application shell.
- Ensure responsive layouts for desktop, tablet and mobile.

## Data and security
- Use synthetic, clearly labelled data only.
- Never request, create, import, paste or infer real police personnel data, vehicle registration data, movement records, confidential correspondence or operational information.
- Do not add intelligence, surveillance, informant management, patrol routes, live officer tracking, tactical deployments, incident/case files, evidence, dispatch or controlled weapons/armoury features.
- Do not imply that the prototype has real authentication, authorisation, audit, encryption, backend persistence or production hosting.
- Do not add external APIs, analytics, tracking pixels, remote fonts, external scripts, cloud dependencies or paid services.

## No-funding constraint
- Current design and local prototype work must remain at ZMW 0 additional cash cost.
- Use existing tools and local open files. Do not install paid tools or activate subscriptions.
- If a proposed change requires a paid dependency, hosting subscription, API, credit purchase, hardware or procurement, stop and document the dependency rather than proceeding.

## Engineering rules
- Inspect the existing repository before editing.
- Make small, reviewable changes.
- Keep content, styling and interaction logic separated.
- Use semantic HTML and accessible labels.
- Provide keyboard focus states and Escape-to-close for dialogs.
- Do not add controls that have no action. For unavailable functions, use a clear disabled state or an honest demonstration dialog.
- Test all navigation links, filters, search, dialogs and responsive behaviour.
- Run HTML/JS checks and browser smoke tests. Do not report a test as passed unless it was actually executed.
- Preserve the exact crest asset and verify its placement on each screen.

## Acceptance checklist
1. All nine screens render.
2. The user-supplied crest appears in the shared application shell on every screen.
3. Green/white/blue appear in the requested order at the top.
4. No production police data is present.
5. No excluded operational features are present.
6. Responsive navigation works.
7. Keyboard focus, skip link and dialog close behaviour work.
8. No external network or paid dependency is required.
9. README and screen specifications describe the actual implementation.
