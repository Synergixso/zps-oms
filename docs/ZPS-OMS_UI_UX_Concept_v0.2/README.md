# ZPS-OMS UI/UX Concept v0.2

A redesigned, responsive, local-first UI/UX prototype for the Zambia Police Service Operations Management System (ZPS-OMS). This release replaces the initial v0.1 visual approach and embeds the exact Zambia Police Service crest image supplied by the user as `assets/zambia-police-service-crest.png`.

## Open the prototype

1. Extract the project folder.
2. Open `index.html` in a modern browser, or run a local static server from this folder:
   - `python -m http.server 4173`
   - Open `http://localhost:4173`
3. Use the persistent left navigation to move between the nine screens.

No package installation, API key, external font, third-party script, remote image or paid subscription is required.

## Screens

1. Operations overview
2. Provincial divisions
3. Divisional formations
4. Fleet & transport
5. Maintenance requests
6. Assets & equipment
7. Administrative requests
8. Reports & insights
9. Users & permissions

The prototype includes local-only interactions for navigation, search, basic filtering, contextual dialogs and demonstration forms. It does not connect to a backend, persist records, authenticate users or communicate with police infrastructure.

## Brand and crest handling

- The exact uploaded Zambia Police Service crest is included at `assets/zambia-police-service-crest.png`.
- The image is displayed without redrawing, recolouring, cropping, distorting or substituting it.
- The institutional colour sequence is represented as green at the top, white in the middle and blue at the bottom.
- The working hex values in `docs/DESIGN_SYSTEM.md` are provisional screen-design values only. They are not asserted to be official brand standards.
- Obtain the Service's written approval and approved high-resolution master artwork before official deployment or external publication.

## Institutional scope

The concept is limited to:
- Service Headquarters / Office of the Deputy Inspector General – Operations.
- The ten Provincial Divisions.
- Authorised Divisional Units and formations included in the approved DIG Operations establishment.

Districts, police stations, police posts, police training administration and general Service-wide HR/payroll are outside this design scope. Public-source formation names and reporting relationships remain subject to confirmation against the current approved internal establishment.

## Safety and data

All names, figures, references, dates, records and summaries are synthetic design examples. Do not enter live or personal police information. The concept excludes tactical deployment plans, patrol routes, real-time officer tracking, intelligence, informants, surveillance, operational incidents/cases, evidence, armoury information and controlled operational equipment.

Before any production use, the Service must approve the data classification, business owner, hosting, identity management, access model, security controls, legal basis, retention schedule, incident response, audit model, backup and disaster recovery arrangements.

## No-funding constraint

This is a local static prototype intended to work without paid services, external API calls or subscriptions. Do not add paid libraries, hosting, analytics, AI services or API dependencies without separate written approval. If a required capability would incur cost, document the dependency and pause that work.

## Files

- `index.html` – application shell and crest placement
- `styles.css` – visual system, responsive layouts and components
- `app.js` – page definitions, synthetic sample data and local-only interactions
- `assets/zambia-police-service-crest.png` – exact user-supplied crest
- `docs/DESIGN_SYSTEM.md` – visual tokens and component rules
- `docs/SCREEN_SPECIFICATION.md` – screen-by-screen UI/UX requirements
- `docs/ASSET_AND_BRANDING_NOTES.md` – crest provenance and usage constraints
- `CLAUDE.md` – Claude Code project instructions
