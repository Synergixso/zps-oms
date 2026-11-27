# Intelligence Liaison — Scope and Access Controls

Recorded 27 November 2026 for v0.10.0 under the owner's final system completion directive (Parts 5–7, 12) and decisions DEC-072 and DEC-073. All data synthetic.

## 1. What was implemented, and what was deliberately not

The directive adds four Police Intelligence Officer role profiles and, in the same breath, keeps substantive intelligence work out of ZPS-OMS. The implementation follows that boundary literally: the four roles get **restricted administrative liaison workspaces** that record and route **metadata about** liaison submissions and report references held outside the system. The system never holds the substance.

| Implemented (administrative metadata) | Not implemented, by design |
|---|---|
| Generated reference (`LIA-YYYY-NNNNNN`) | Human informant identities or contact records |
| Reference number of the off-system document | Covert source-management databases |
| Originating and receiving (holding) organisation units | Surveillance records |
| Dates submitted, received and acknowledged | Intelligence target profiles |
| Responsible administrative account | Collection methods or collection plans |
| Administrative classification (Unclassified / Restricted) | Tactical intelligence tasking |
| Submission and acknowledgement status | Operational intelligence content of any kind |
| Approval reference | Intelligence analysis repositories or link charts |
| Routing history (who, when, from, to, status before and after) | Access to personnel, manpower, roster or assignment registers |
| Restricted transaction history and notifications | Real-time tracking of any officer |

If substantive intelligence handling is ever required it must be a **separate system proposal** with its own security architecture, classification controls, legal assessment and institutional authorisation. It must not be added to this application.

## 2. The four roles

| # | Role | Tier | Assignable at | Coverage | Dashboard |
|--:|---|:-:|---|:-:|---|
| 07 | National Police Intelligence Officer | 1 | Service HQ | National (HQ assignment only) | National Police Intelligence Officer Dashboard |
| 19 | Division Police Intelligence Officer | 2 | Provincial Division or Unit/Formation | Assigned unit and subordinate units | Division Police Intelligence Officer Dashboard |
| 30 | District Police Intelligence Officer | 3 | District Command | Assigned unit and subordinate units | District Police Intelligence Officer Dashboard |
| 31 | Police Intelligence Officer | 4 | Section or Police Station | Assigned unit only | Police Intelligence Officer Dashboard |

Role 31 is one canonical profile; its scope follows the assignment (a Section or a Police Station). It is not duplicated per unit.

## 3. Permission template

Each liaison role holds exactly these seven permissions and nothing else (`src/server/domain/catalogue.ts`, `P.liaison`):

| Permission | Allows |
|---|---|
| `liaison.metadata.view` | View liaison metadata within scope |
| `liaison.metadata.create` | Record a reference for the officer's **own office** only |
| `liaison.metadata.update_own` | Correct a **draft** for which the officer is responsible |
| `liaison.submission.acknowledge` | Record receipt and acknowledgement at the officer's own office |
| `liaison.reference.route` | Submit and route through approved channels |
| `liaison.status.view` | View submission and acknowledgement status and summaries |
| `liaison.audit.view` | View the liaison transaction history within scope |

No other role holds any `liaison.*` permission, including Superadmin, the technical administrators, the Inspector General and the DIG Operations. The liaison roles hold no personnel, manpower, roster, assignment, area, disposition, correspondence, calendar, stores, fleet, asset, report, audit, user or platform permission. Technical authority and business approval authority stay separate: recording receipt and acknowledgement is an administrative act of the receiving office, not an approval.

## 4. Controls and where each is enforced

| # | Control | Enforcement (server-side) | Test evidence |
|---|---|---|---|
| C1 | Metadata only: no content field exists | Schema (migration 013): no subject, note, narrative, summary, body, description, details, comment or attachment column in `liaison_records` or `liaison_routing` | `liaison` › "the data model has no free-text content column" (asserted against `information_schema`) |
| C2 | Reference fields cannot carry text | `liaison.ts` `refField`: letters, digits, `/ - .` only, 2–40 characters, no spaces; `screenRef` refuses excluded terms (for example *informant*, *surveillance*, *covert*) even without spaces | `liaison` › "reference fields accept reference numbers only"; browser: free text refused in the form |
| C3 | Generic fields elsewhere are not a bypass | Liaison roles have no correspondence, calendar or request permission; the prohibited-term screen on those modules gains *informer* and *covert* | `liaison` › "no … correspondence, calendar … access"; `scheduling-correspondence` |
| C4 | Scope by level | `scopeSql` / `visible`: holding or originating unit in the officer's coverage, or the officer is responsible | `liaison` › "station, district, division and national officers each see only their own scope" |
| C5 | Another Province sees nothing | Coverage never reaches a sibling Division; out-of-scope reads → neutral 404 and a DENIED SECURITY audit event | `liaison` (Lusaka officer); browser 404; `npm run test:security` (Lusaka, Section and Station officers → 404) |
| C6 | Tier 4 never reaches the parent District or Division | UNIT coverage | `liaison` (station officer cannot see the HQ → Division record); security probe |
| C7 | Drafts are need-to-know | A draft is visible only at its own office (not to supervising or national officers) until submitted | `liaison` › national officer does not see station or Lusaka drafts; Division officer gets 404 on a station draft |
| C8 | Only the receiving office acts on what it receives | `actsAt`: receipt, acknowledgement, closure and onward routing need a liaison assignment **at** the holding office; a supervising officer with subtree coverage sees but cannot act | `liaison` › Division officer refused "record receipt" at a District |
| C9 | Approved channels only | `checkChannel`: the receiving office must be directly above or below in the same line of command (`org_unit_closure`) and have an active liaison officer; another Province and offices without an officer are refused | `liaison` › "refuses routing outside approved channels …" |
| C10 | Records for own office only | `createLiaison` refuses a subordinate unit or another Province | `liaison` |
| C11 | Responsibility | Only the responsible officer submits or withdraws a draft; withdrawal is impossible after receipt; receipt transfers responsibility to the receiving officer | `liaison` workflow test |
| C12 | Dates | Not in the future; receipt not before submission; acknowledgement not before receipt | `liaison` |
| C13 | Concurrency | Every change is conditional on the record version | code review; pattern shared with other modules |
| C14 | Audit | Every action writes a hash-chained audit event with the reference, units, previous and resulting status and the approval reference; every refusal is a SECURITY event | `liaison` (route event details; DENIED view event); `npm run verify:audit` |
| C15 | Notifications | The receiving office's officers are notified on routing; the submitting officer on acknowledgement; links open the record, which re-checks scope | `liaison`; browser (district officer sees the notification) |
| C16 | Other roles locked out | Liaison pages and records show the access-denied page to roles without `liaison.*` (audited) | `liaison`; browser; security probes |
| C17 | Public website | The public site does not advertise the liaison roles (operational security); it implies no intelligence functionality | `e2e/public-site.spec.ts` (content unchanged) |

## 5. Pages per role (directive Part 5)

| Directive page | Route | 07 | 19 | 30 | 31 |
|---|---|:-:|:-:|:-:|:-:|
| Liaison dashboard | `/app` | ✓ | ✓ | ✓ | ✓ |
| Assigned (administrative) references | `/app/liaison/assigned` | ✓ | ✓ | ✓ | ✓ |
| Liaison activity register / Division, District, Local liaison register | `/app/liaison` | ✓ | ✓ | ✓ | ✓ |
| Administrative submission register / Submission status / Administrative submissions | `/app/liaison/submissions` | ✓ | ✓ | ✓ | ✓ |
| Report reference tracking | `/app/liaison/reports` | ✓ | | | |
| Organisational routing | `/app/liaison/routing` | ✓ | | | |
| Submission status (acknowledgements) / Administrative review / Routing and acknowledgements / Administrative acknowledgements | `/app/liaison/acknowledgements` | ✓ | ✓ | ✓ | ✓ |
| Administrative review queue / Receiving and routing register | `/app/liaison/incoming` | ✓ | ✓ | | |
| Audit history / History / Administrative history | `/app/liaison/history` | ✓ | ✓ | ✓ | |
| Notifications | `/app/notifications` | ✓ | ✓ | ✓ | ✓ |
| My profile | `/app/profile` | ✓ | | | ✓ |
| Record a reference; record detail with routing and actions | `/app/liaison/new`, `/app/liaison/records/[id]` | ✓ | ✓ | ✓ | ✓ |

Navigation labels follow the directive's page names for each tier (`workspace-config.ts`, `labels`). Pages not in a role's navigation are still permission-checked on the server; for example a District officer may open `/app/liaison/incoming` because it holds the permission, while a non-liaison role gets the access-denied page.

## 6. Synthetic accounts

| Username | Role | Office |
|---|---|---|
| `demo.hq.pio` | 07 National | Service HQ |
| `demo.cb.pio` | 19 Division | Copperbelt Division |
| `demo.kitwe.pio` | 30 District | Kitwe District Command |
| `demo.kitwec.pio` | 31 Police Intelligence Officer | Kitwe Central Police Station |
| `demo.mu.section.pio` | 31 Police Intelligence Officer | 1 Section, 1 Platoon, Mobile Unit |
| `demo.lsk.pio` | 30 District | Lusaka Central District Command (cross-Province tests) |

All use the published development password and exist only in development and test databases (`seed-liaison.ts`; production never runs synthetic seeds).

## 7. Status

| Item | Status |
|---|---|
| Four role profiles, workspaces and dashboards | Completed and Verified |
| Restricted permission template | Completed and Verified |
| Metadata-only data model and validation | Completed and Verified |
| Scope, channels, need-to-know drafts, receiving-office acts | Completed and Verified |
| Audit, notifications, history | Completed and Verified |
| Information-security and legal review of the liaison metadata, the classification list and retention | **Blocked by External Dependency**: Service decision (DEC-073) |
| Real liaison officer accounts and delegations | **Blocked by External Dependency**: institutional approval (X06) |
