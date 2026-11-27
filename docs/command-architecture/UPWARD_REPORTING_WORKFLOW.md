# Upward Reporting Workflow (bottom-up)

Recorded 27 November 2026 for v0.11.0 (owner directive Parts 7.2, 7.4). Implementation: `command.ts` (`createReport`, `submitReport`, `acknowledgeReport`, `reviewReport`, `forwardReport`, `closeReport`), pages under `/app/command/reports`.

## 1. Designated recipients

The reporter does not choose recipients. `designatedRecipients(office)` returns:
- **primary**: the office's PRIMARY_REPORTING superior(s), or else its PRIMARY_COMMAND superior;
- **parallel**: its PARALLEL_REPORTING and ADMIN_COORDINATION superiors.

So a junior officer cannot silently bypass the designated superior, and authorised parallel recipients always receive the same report.

## 2. Lifecycle

| Step | Report status | Recipient status | Who | Rule |
|---|---|---|---|---|
| Create | DRAFT | — | Holder of the reporting office (*submit reports*) | Summary, progress, outstanding matters screened; supporting references are reference numbers only |
| Submit | SUBMITTED | PENDING (one row per recipient office) | Reporting office | Needs at least one designated superior; recipients notified |
| Acknowledge | — | ACKNOWLEDGED | Each recipient office separately | — |
| Review (noted / recommended) | — | REVIEWED | Recipient office | Parallel recipients record their own review |
| Return for correction | RETURNED | RETURNED | Primary or forwarded recipient only | Reason required; the reporter is notified |
| Resubmit | SUBMITTED | all reset to PENDING | Reporting office | Corrected text; submission count increases |
| Forward | — | FORWARDED; new FORWARDED row for the next superior | Reviewed primary/forwarded recipient | Same report, same reference; parallel recipients never forward along the other channel |
| Consolidation | — | — | Any office in the chain | One report row, all recipients and the full history on one page |
| Escalation | — | — | System and reporters | Overdue reminders escalate to the next superior (automation); an *escalation* report category exists for officers |
| Close | CLOSED | CLOSED | Reviewed primary/forwarded recipient | Reporter notified |
| Historical retrieval | — | — | Reporter and recipient offices | `report_events` and audit events |

## 3. Record fields

Reference (`RPT-YYYY-NNNNNN`) · reporting officer · reporting office · originating unit · category (status, progress, completion, area status, escalation, administrative recommendation) · related directive · reporting date · reporting period · general administrative summary · progress status · outstanding administrative matters · supporting administrative references · primary superior and parallel recipients (recipient rows) · review, acknowledgement and forwarding history · closure status.

## 4. Pages

| Directive page name (Part 8) | Route |
|---|---|
| Reports Awaiting Executive Review; Pending Reviews; Area Administrative Reports; Divisional Submissions; Area Reports Received; Junior Status Reports | `/app/command/reports` |
| Reports Submitted to IG; Status Reports to DIG Operations; Reports to District; Submission History; Status Report Submission | `/app/command/reports/submitted`, `/app/command/reports/new` |
| Report detail with recipients, acknowledgements and history | `/app/command/reports/[id]` |
