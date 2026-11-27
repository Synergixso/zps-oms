# Tier 4 Implementation — Section / Police Station

> Generated from `src/server/domain/catalogue.ts` and `src/server/domain/workspace-config.ts` — the configuration the server enforces. Do not edit by hand; run `npm run docs:permissions`.

One canonical role profile, the Police Intelligence Officer (31), assignable at a Section or a Police Station. UNIT coverage: the assigned office only, never the parent District or Division. Restricted liaison workspace: administrative metadata only (DEC-073).

Status, tests and evidence per role: `docs/development/ROLE_BACKOFFICE_DEVELOPMENT_STATUS.md` and `docs/role-architecture/ROLE_TEST_RESULTS.md`.

### Role 31 — Police Intelligence Officer

- **Code:** `INTEL_OFFICER` · **Tier:** 4 · **Category:** FUNCTIONAL
- **Back office:** Police Intelligence Officer Dashboard
- **Organisational context:** Assigned Section or Police Station only — assignable at: section, station
- **Purpose:** Restricted local intelligence liaison administration for the assigned Section or Police Station only (one role profile; scope follows the assignment). No access to the parent District or Division. Administrative metadata only (references, units, dates, status and routing). No intelligence content, sources, informants, surveillance, targets, collection or tasking exist in ZPS-OMS, and no access to personnel, manpower, roster or assignment registers.
- **Workspace purpose line:** Local intelligence liaison administration for your Section or Police Station only. Metadata only.
- **Navigation:** Overview (`/app`, `/app/tasks`) · Liaison administration (`/app/liaison/assigned`, `/app/liaison`, `/app/liaison/submissions`, `/app/liaison/acknowledgements`) · Account (`/app/notifications`, `/app/profile`)
- **Headline figures:** `liaisonAssigned`, `liaisonIncoming`, `liaisonToAcknowledge`, `liaisonAwaiting`, `myTasks`, `unread`
- **Quick actions:** Record a liaison reference, Outstanding acknowledgements
- **Working panels:** dashboard kind `LIAISON`
- **Permissions (7):** `liaison.metadata.view` (U), `liaison.metadata.create` (U), `liaison.metadata.update_own` (U), `liaison.submission.acknowledge` (U), `liaison.reference.route` (U), `liaison.status.view` (U), `liaison.audit.view` (U)

