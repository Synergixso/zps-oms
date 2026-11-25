# Claude Code Handoff — ZPS-OMS UI/UX v0.2

## Objective
Use this design as a visual reference when implementing the ZPS-OMS frontend in the approved application repository. Do not assume the static HTML must be copied literally; preserve its design decisions and screen intent while following the approved application architecture and stack.

## Required sequence
1. Inspect the ZPS-OMS repository, CLAUDE.md, BMad project artefacts and the approved Phase 1 requirements.
2. Compare the nine screen specifications in `SCREEN_SPECIFICATION.md` against the latest approved PRD and record conflicts.
3. Obtain explicit approval before changing the agreed institutional scope, logo treatment or excluded features.
4. Build the global application shell and design tokens first.
5. Implement the nine screens as reusable components with typed synthetic fixtures.
6. Keep business logic and API integrations out of the visual prototype until the architecture and security approvals exist.
7. Run responsive, accessibility and interaction tests at desktop, tablet and mobile breakpoints.
8. Capture screenshots for each page and compare them against the concept.
9. Document any departures from this concept and the reason for each.

## Quality gates
- The exact supplied crest appears in the shared navigation shell and is not modified.
- Green/white/blue band sequence is correct on all screens.
- No remote fonts, images, scripts, trackers, telemetry or paid dependencies.
- No live or personal police records.
- No excluded operational capability.
- Search, filters, navigation and dialogs are tested.
- Keyboard focus is visible and dialogs close via Escape.
- Layout works at 1440px, 1024px, 768px and 390px widths.
- Screen reader labels and WCAG 2.2 AA contrast are reviewed.
- README, screen specification and design system match the delivered code.

## Cost constraint
The current local design prototype must remain at ZMW 0 additional cash expenditure. Stop and document any requirement that would introduce a paid service, paid package, hosting subscription, API or credit consumption.

## Do not do
- Do not connect this design to real police databases.
- Do not create real authentication or user accounts in the prototype.
- Do not fabricate official command relationships or titles.
- Do not invent an official colour standard beyond the user-specified sequence.
- Do not modify or substitute the supplied crest.
- Do not introduce tactical operations, intelligence, surveillance, dispatch, patrol routing, live tracking, evidence/case management or armoury features.
