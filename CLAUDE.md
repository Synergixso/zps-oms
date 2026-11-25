# ZPS-OMS — Claude Code project instructions

Zambia Police Service Operations Management System. **Local synthetic-data prototype for institutional review — not an authorised police system.** Rules from `docs/04_CLAUDE_CODE_CURRENT/zps_oms_phase1_claude_pack_v1.2/` (CLAUDE.md + `.claude/rules/`) remain binding; this file adds codebase-specific guidance.

## Non-negotiables
- Scope: DIG Ops Service HQ, ten Provincial Police Divisions, authorised formations. No districts/stations/posts, training, HR/payroll, intelligence, investigations, evidence, tactical/dispatch/tracking, firearms/armoury. Do not add excluded capability even if a design suggests it.
- Synthetic data only (`demo.` usernames, "Demo" display names, `SYN-` references). Never real Police names, service numbers, plates, locations or documents.
- ZMW 0: no paid services, APIs, hosting, subscriptions. Free downloads that change the toolchain (BMAD installer, Playwright browsers) need a recorded decision first.
- Crest: `public/brand/zambia-police-service-crest.png` must stay byte-identical to `assets/zambia-police-service-crest.png`; render only via `<Crest>`. Band order green/white/blue.
- Role label is exactly **Division Staff Ops**. No superadmin / CRM Administrator role.

## Architecture (see docs/DECISION_REGISTER.md ADR-001…005)
- `src/server/domain/*` — business rules **and all authorisation and audit**. Every function takes `(db, actor, …)`. Never authorise only in a page or action.
- `src/server/domain/catalogue.ts` — the permission catalogue (source for `docs/generated/PERMISSION_MATRIX.md`; regenerate with `npm run docs:permissions`).
- `src/server/domain/policy.ts` — `loadActor`, `scopeFor`, `can`, `requirePermission`, `scopeSql`, `canApprove` (delegation + business role).
- `src/server/actions/*` — thin server actions; map errors with `toState`.
- `src/server/db/schema.ts` (migrations), `seed.ts` (drives real services with a back-dated clock).
- `src/app/(public)` public pages; `src/app/app/*` authenticated back office; `src/components/ui.tsx`, `forms.tsx`.
- Never trust org/role/user ids from the browser; out-of-scope reads → `notFound()` via `loadOr404`.

## Workflow for changes
1. Read the relevant domain module and its tests. 2. Change domain logic first, with a test (`tests/`). 3. Then actions/UI. 4. Run `npx tsc --noEmit`, `npm test`, and with `npm run dev` running, `npm run audit:routes`. 5. Update docs (traceability, decision register, CHANGELOG). Never claim a test passed without running it.

## Commands
`npm run dev` (port 3100) · `npm test` · `npm run build` · `npm run audit:routes` · `npm run docs:permissions` · `npm run db:reset` (synthetic DB only; stop server first)
