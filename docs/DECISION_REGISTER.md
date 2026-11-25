# Decision Register — ZPS-OMS

| Field | Value |
|---|---|
| Version | 1.0 (25 Nov 2026) |
| Status | Developer-proposed decisions. **None is institutionally approved.** |
| Rule | Every entry marked *Proposed* or *Open* needs the named authority's written decision before production use. |

Status values: **Open** (no decision; blocks something) · **Proposed** (developer recommendation applied to the local prototype only) · **Applied (user instruction)** (the project owner instructed it in this engagement).

| ID | Decision / question | Source / conflict | Prototype position | Status | Authority |
|---|---|---|---|---|---|
| DEC-001 | Controlling scope = DIG Ops HQ + 10 Provincial Divisions + authorised formations; no districts/stations/posts; no tactical/intelligence/HR/training | Master prompt Part C; Claude pack v1.2 CLAUDE.md; PRD v1.0 §3 (consistent) | Enforced: `unit_type` CHECK constraint permits only SERVICE_HQ, HQ_OFFICE, PROVINCIAL_DIVISION, FORMATION | Applied (user instruction); institutional approval Open (Exit Gate 1) | High Command / DIG Ops |
| DEC-002 | Role label "Division Staff Ops" replaces "Unit Commander" / "Provincial administrative officer" | Master prompt T2. PRD v1.0 §5.2/§8.2 uses "Provincial admin officer"; no "Unit Commander" or "CRM Administrator" text found in any repository source (searched .md/.js/.html; .docx text extracted for PRD) | Role `DIVISION_STAFF_OPS` = "Division Staff Ops"; PRD's provincial admin officer persona mapped to it. No CRM Administrator / superadmin role exists | Applied (user instruction) | DIG Ops |
| DEC-003 | Prototype technology stack | Master prompt L1 (Next.js/React/TS/Tailwind); PRD prefers PostgreSQL + NestJS-like backend | Next.js 16 modular monolith (App Router, server actions), TypeScript, Tailwind 4, Zod 4; no separate backend service | Proposed | Technical Services Directorate |
| DEC-004 | Intermediate HQ supervisory positions (PSS01/PSS02/PSS03 per public Appendix D) — nodes or roles? | Pack v1.2 doc 02 vs master prompt C3 ("some formations may have intermediate supervisory positions") | Not modelled. `HQ_OFFICE` unit type exists so they can be added through the approval-controlled change workflow without code change | Open | DIG Ops / establishment owner |
| DEC-005 | Authentication for the prototype | Master prompt L4; PRD §7.2 | Clearly-labelled synthetic role simulator; no passwords; hashed opaque session tokens; disable with `ZPS_DEMO_AUTH=off`. Production IdP/MFA not selected | Proposed (prototype only); production Open | Technical Services |
| DEC-006 | Database for the prototype | PRD prefers PostgreSQL; PostgreSQL is **not installed** locally; zero-funding rule | SQLite via Node's built-in `node:sqlite` (no native dependency, no download). Portable SQL; PostgreSQL remains the production candidate | Proposed (ADR-003) | Technical Services |
| DEC-007 | Role → permission matrix | Master prompt Part K ("proposed starting matrix, not an approved delegation") | Implemented as `catalogue.ts`; docs generated from it | Proposed | DIG Ops + Security |
| DEC-008 | Approval routing per request category | Master prompt G ("never hard-code unapproved police approval chains") | Versioned demonstration definitions in `workflow_definitions`, labelled "Demonstration-only routing". No editor UI until approved | Open | DIG Ops / process owners |
| DEC-009 | Fleet & maintenance system of record (possible duplication with Technical Services) | PRD §7.4, pack prompt 03 | Prototype register only; banner on fleet screens | Open | Technical Services |
| DEC-010 | Official brand colours & crest usage rights | Asset & branding notes v0.2 | Provisional tokens #16823B / #FFFFFF / #133F91; crest used unmodified (SHA-256 verified) | Open | ZPS Public Relations / High Command |
| DEC-011 | Approved administrative request categories | PRD FR-WF-001 | 4 demonstration categories (office supplies, facility repair, ICT support, administrative return) | Open | DIG Ops |
| DEC-012 | Report owners, audiences and release rules | PRD §7.6 | 4 aggregate report definitions with field allowlists | Open | DIG Ops / data owners |
| DEC-013 | External notifications (email/SMS/WhatsApp) | Master prompt M09, L5 | Disabled (setting `integrations.external_notifications = DISABLED`); in-app only | Applied (user instruction) | Technical Services / Security |
| DEC-014 | Maintenance approval threshold (ZMW) | None in sources | ZMW 5,000 synthetic, provisional, stored in `app_settings` | Open | DIG Ops / Finance |
| DEC-015 | Request SLA / overdue threshold | None in sources | 10 days after submission, provisional | Open | DIG Ops |
| DEC-016 | Approval authority model | Master prompt D4 ("approval permissions must be granted separately through an approved delegation") | Approval = active delegation (domain, org, category, validity, reference) **and** active BUSINESS role at the same org; self-approval refused; technical/security/audit roles can never approve | Proposed | DIG Ops + Security |
| DEC-017 | Record-level vs aggregate access for DIG Ops Executive | Master prompt D1 ("do not grant unrestricted access to every underlying record") | National aggregates + HQ-originated records + items routed to HQ approval; no record-level provincial access | Proposed | DIG Ops |
| DEC-018 | Organisational relationship type for formations | Master prompt C3 | Seeded as `ADMINISTERED_BY` HQ (not `REPORTS_TO`) to avoid asserting command lines | Proposed | Establishment owner |
| DEC-019 | Retention periods | Master prompt M ("do not invent retention periods") | None implemented; nothing is purged | Open | Records / Legal |
| DEC-020 | BMAD tooling | Master prompt O ("inspect installed tooling first") | BMAD Method is **not installed** in the repository (`npx bmad-method` would download v6.12.4). Lifecycle followed manually; not installed to avoid unapproved toolchain change | Open (toolchain decision, Exit Gate 10) | Technical Services |
| DEC-021 | M07 Availability/Scheduling and M08 Correspondence | Master prompt F | Not implemented (later phase, separate approval) | Applied (user instruction) | DIG Ops / Security |
| DEC-022 | Use of Claude Code and AI tooling on institutional material | Pack v1.2 rule 02 | Used on synthetic data only in this engagement | Open (Exit Gate 10) | Technical Services / Legal |
| DEC-023 | Hosting, production data, security accreditation | Master prompt N | Out of scope; local only | Open | High Command / Technical Services |
| DEC-024 | Hero photography | Project owner supplied two generated images (public/hero/hero-01.webp, hero-02.webp) on 25 Nov 2026 and instructed their use in the landing-page hero. They depict uniforms, insignia, a formation name (Kamfinsa Mobile Unit), firearms, riot shields and an armoured vehicle, and are not approved Service photography | Used as instructed, cross-faded, labelled "Illustrative imagery", decorative alt text. Must be replaced by, or approved as, official photography with usage rights before any institutional publication; tactical depictions may conflict with the administrative-only positioning (master prompt I4, DESIGN_SYSTEM data-visualisation guidance) | Applied (user instruction); publication approval Open | ZPS Public Relations / High Command |

## Architecture decision records

### ADR-001 Modular monolith
Single Next.js application with server-only domain modules (`src/server/domain/*`) separated from presentation (`src/app`, `src/components`) and from data access (`src/server/db`). Rationale: smallest maintainable footprint, one deployable, no network hops; microservices unjustified at this stage.

### ADR-002 Domain layer owns all authorisation
Every domain function takes an `Actor` (loaded fresh from the DB per request) and performs its own permission, scope, state and delegation checks. Pages and server actions never authorise on their own; UI hiding is cosmetic. Rationale: one enforcement point that unit tests exercise directly.

### ADR-003 SQLite (node:sqlite) for the local prototype
Built into Node ≥22.13 — zero download, zero native compilation, zero cost. SQL avoids engine-specific features except audit immutability triggers (PostgreSQL equivalent: `BEFORE UPDATE/DELETE` trigger raising an exception, plus REVOKE). Trade-off: experimental API warning; single-writer. Migration path in DEPLOYMENT_GUIDE.md.

### ADR-004 Hash-chained append-only audit
Each audit row stores `prev_hash` and `hash = SHA-256(prev_hash ‖ canonical fields)`; triggers abort UPDATE/DELETE. `verifyAuditChain()` re-computes the chain (shown on audit, platform dashboards). Not a substitute for WORM storage in production.

### ADR-005 Server actions + same-origin route handlers
Mutations use Next.js server actions (built-in Origin/Host check = CSRF defence). CSV exports use POST route handlers with an explicit same-origin check.
