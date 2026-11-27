# Directive Workflow (top-down)

Recorded 27 November 2026 for v0.11.0 (owner directive Parts 5, 7.1, 7.3). Implementation: `command.ts` (`issueDirective`, `forwardDirective`, `directiveStep`), pages under `/app/command/directives`.

## 1. Transaction types

| Type | Category code | Who may issue |
|---|---|---|
| Formal command directive | `COMMAND_DIRECTIVE` | Primary command superior only |
| Administrative instruction | `ADMIN_INSTRUCTION` | Primary command or administrative coordination superior |
| Operations administrative task | `OPS_ADMIN_TASK` | Primary command or administrative coordination superior |
| Personnel-related administrative assignment | `PERSONNEL_ASSIGNMENT` | Primary command superior only |

Task acknowledgements, status reports, escalations and administrative recommendations are separate transactions: acknowledgements are directive events, and the rest are report categories (`UPWARD_REPORTING_WORKFLOW.md`).

## 2. Lifecycle

| # | Step | Status | Who | Rule |
|--:|---|---|---|---|
| 1 | Create | ISSUED | Holder of the issuing office (substantive, or acting with *issue directives*) | Recipient must be **directly below** in a primary command or coordination relationship; category allowed for that relationship; free text screened; related record within the issuer's scope |
| 2 | Reference | — | System | `DIR-YYYY-NNNNNN` |
| 3 | Route and notify | — | System | Holders of the receiving office (and acting holders with *acknowledge*) are notified |
| 4 | Acknowledge | ACKNOWLEDGED | Receiving office | Required unless the issuer waived it |
| 5 | Assign onward | parent → IN_PROGRESS | Receiving office (*assign or forward*) | A new directive to an office directly below, linked to the parent; same rules as step 1 |
| 6 | Progress | IN_PROGRESS | Receiving office | Note required |
| 7 | Report completion | COMPLETED | Receiving office | Refused while any directive assigned onward is still open; may cite a submitted completion report |
| 8 | Consolidated status | — | System | The detail page shows every directive below it with its status, so the issuer sees the whole chain |
| 9 | Close | CLOSED | Issuing office (*close or cancel*) | Only after completion is reported |
| — | Cancel | CANCELLED | Issuing office | Reason required; or a conflict decision |
| 10 | History | — | System | `directive_events` (sequence, action, user, office, authority, status before/after, note) and a hash-chained audit event per step |

Every state change is version-conditional. A step that loses a race to another change is refused, and nothing is recorded.

## 3. Record fields

Reference · issuing officer · issuing office · issuing unit (the office's unit) · issuing authority (substantive or acting, with the acting appointment) · category · administrative subject · general instructions · date issued · effective date · receiving office and unit · assigned responsibility (the receiving office) · acknowledgement requirement · due date · status · completion report reference · related record (manpower request, assignment or transfer reference) · parent directive · history.

There are no fields for tactical plans, patrol routes, officer locations or intelligence, and excluded terms are refused in the free text.

## 4. Pages

| Directive page name (Part 8) | Route |
|---|---|
| National Command Overview; Operations Command Dashboard; HQ, Formation, District and Station command dashboards | `/app/command` (title adapts to the office) |
| Directives received; Directives Received from IG; Assigned National Directives; Administrative Directives Received | `/app/command/directives` |
| National Executive Directives; Directives Issued to Commissioner Operations; Outgoing Authorised Instructions; Instructions to Area Commanders | `/app/command/directives/issued` |
| Issue a directive | `/app/command/directives/new` |
| Directive detail, assignment onward, task tracking, command history | `/app/command/directives/[id]` |
