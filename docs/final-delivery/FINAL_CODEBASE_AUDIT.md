# Final Codebase Audit

Recorded 27 November 2026 at the start of the final system completion directive (Stage 1), against v0.9.1 (local checkpoint `684a559`). The full existing-system audit from the previous directive remains in `COMPREHENSIVE_EXISTING_SYSTEM_AUDIT.md`. This audit covers what the new directive changes: the role catalogue, the four Police Intelligence Officer roles, and anything else found while inspecting the code, the database and the running application.

## 1. Baseline

| Area | State found |
|---|---|
| Stack | Windows 11, Next.js 16.4.6, React 19, TypeScript strict, Tailwind 4, MySQL (XAMPP MariaDB 10.4), raw parameterised SQL; no competing database |
| Database | Migrations 001–012 applied; 27 active roles; 55 active role assignments; 54 synthetic users |
| Tests | 158 domain and integration tests (26 files), 15 browser tests, route audit 87 routes × 54 accounts, 14 security probes |
| Modules | 17 of 17 implemented and verified (`ALL_17_MODULES_VERIFICATION.md`) |
| Roles | 27 roles in three tiers, each with its own workspace, navigation, figures and quick actions |
| Public site | Home, About, Features, Technical Team, How It Works, Contact, Login; `/modules` → 308 → `/features` (done in v0.9.0) |

## 2. Findings

| # | Finding | Severity | Classification | Resolution |
|---|---|---|---|---|
| F1 | Catalogue had 27 roles; the directive requires 31 in four levels (7 / 12 / 11 / 1) | High | Missing | 31-role catalogue, renumbered 1–31 in the directive's order (DEC-072) |
| F2 | Catalogue sync retired only the 41 listed legacy codes; any other stray role definition would have stayed ACTIVE | Medium | Defective | Every role row not in the code catalogue is retired (`syncCatalogue`) |
| F3 | A retired role's live assignments were not revoked or recorded for reassignment | Medium | Missing | Revoked with reason, recorded in `role_reassignments`, shown to administrators in scope; resolved only by an authorised grant |
| F4 | Unreferenced obsolete role rows were never deleted | Low | Missing | Deleted when nothing references them; referenced rows kept |
| F5 | No Police Intelligence Officer roles, workspaces or liaison function | High | Missing | Four roles with restricted, metadata-only liaison workspaces (DEC-073) |
| F6 | No tier 4 level in the type system, dashboards, tests, generators or docs | Medium | Missing | Tier 4 (Section / Police Station) throughout |
| F7 | Dashboard module panel said "15 active · 2 planned" and "Modules 16 and 17 are planned for a later phase", although both shipped in v0.9.0 | Medium (misleading) | Defective (pre-existing) | Panel computes the count; Modules 16 and 17 link to their pages for roles that hold them |
| F8 | Liaison-style roles would have had no activity chart ("No activity data") | Low | Missing | Liaison activity from the routing history |
| F9 | Breadcrumbs showed "Record" for unknown path segments (would have produced "Dashboard / Record / Record / Record" on liaison pages) | Low | Defective | Labels for the liaison routes; the page-less "records" segment is hidden |
| F10 | Reflow browser test ran all roles in one 30-minute test; on a cold build cache it timed out (v0.9.1 runs) | Medium (test reliability) | Defective (test) | One test per tier plus a public-pages test; evidence written once at the end |
| F11 | Route audit's 200-status not-found check (added in v0.9.1) first matched text embedded in every page's data | Medium (test reliability) | Defective (test), found and fixed in the v0.9.1 round | Matches the rendered heading only |
| F12 | Generators, help text, comments and docs assumed 27 roles and fixed role numbers (for example "role 16" for the Armourer) | Low | Outdated | Generators derive counts and numbers from the catalogue; texts updated |
| F13 | The CLAUDE.md exclusion "intelligence/informants" conflicts with the new roles unless the boundary is stated precisely | Governance | Clarification needed | CLAUDE.md and DEC-073: liaison metadata only; content, sources, informants, surveillance, collection and tasking remain excluded |

## 3. Things checked and found sound

- No role picker can offer a retired role: role selection uses the code catalogue.
- No navigation, workspace, dashboard or seed configuration referenced an obsolete role.
- The development database held no obsolete role rows (re-created on 26 November), so no real account needed reassignment.
- Server-side scope enforcement held in every browser and HTTP probe performed during the audit.

## 4. Approach

Nothing was rebuilt. The work extends the existing catalogue, domain layer, workspace configuration, seeds, tests and generators, in the order of the directive's Stages 2–16. Progress is recorded in `EXECUTION_REGISTER.md`.
