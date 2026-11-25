# Generated permission matrix

> Generated from `src/server/domain/catalogue.ts` — the same catalogue the server enforces. Do not edit by hand.

Legend: **U** = own assigned organisation unit only · **N** = national (only when the assignment is held at Service HQ) · blank = denied.

Approval authority is not a role permission: it requires an active delegation record **and** an active BUSINESS-category role at the same organisation unit (`policy.canApprove`).

| Permission | DIG Operations Executive | HQ Operations Coordinator / Secretariat Officer | Provincial Division Commander | Division Staff Ops | Formation Commander | Formation Administrative Officer | Fleet Officer | General Asset Custodian | Internal Auditor | Platform Administrator | Security Administrator | Organisational Registry Administrator | Authorised Operations Staff |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.national.view` — View national aggregate dashboard | N | N |  |  |  |  |  |  |  |  |  |  |  |
| `dashboard.division.view` — View own provincial division dashboard |  |  | U | U |  |  |  |  |  |  |  |  |  |
| `dashboard.formation.view` — View own formation dashboard |  |  |  |  | U | U |  |  |  |  |  |  |  |
| `org.view` — View organisation directory | N | N | N | N | N | N |  |  | N | N | N | N |  |
| `org.propose` — Propose an organisational change |  |  |  |  |  |  |  |  |  |  |  | N |  |
| `user.view` — View user accounts and assignments |  |  |  |  |  |  |  |  |  | N | N |  |  |
| `user.provision` — Provision a user account |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `user.suspend` — Suspend or reactivate a user account |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `user.deactivate` — Deactivate a user account |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `grant.assign` — Assign a role + organisational scope |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `grant.revoke` — Revoke a role assignment |  |  |  |  |  |  |  |  |  | N | N |  |  |
| `delegation.grant` — Record an approved delegation of approval authority |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `delegation.revoke` — Revoke a delegation |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `accessreview.manage` — Open and decide access recertification reviews |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `request.view` — View administrative requests | U | N | U | U | U | U |  |  | N |  |  |  | U |
| `request.create` — Create a draft administrative request |  | U |  | U |  | U |  |  |  |  |  |  | U |
| `request.edit` — Edit own draft or returned request |  | U |  | U |  | U |  |  |  |  |  |  | U |
| `request.submit` — Submit a request for review |  | U |  | U |  | U |  |  |  |  |  |  | U |
| `request.assign` — Assign a submitted request to a processor (moves to Under Review) |  | N | U |  | U |  |  |  |  |  |  |  |  |
| `request.cancel` — Cancel a draft/submitted/returned request |  | U |  | U |  | U |  |  |  |  |  |  | U |
| `request.progress` — Start work on, and complete, an approved request |  | U |  | U |  | U |  |  |  |  |  |  |  |
| `request.close` — Close a completed request |  | N | U |  | U |  |  |  |  |  |  |  |  |
| `request.reopen` — Reopen a closed request through controlled reopening |  |  | U |  | U |  |  |  |  |  |  |  |  |
| `fleet.view` — View vehicle register |  | N | U | U | U | U | U |  | N |  |  |  |  |
| `fleet.manage` — Create and edit vehicle administrative records |  |  |  |  |  |  | U |  |  |  |  |  |  |
| `maintenance.view` — View maintenance requests |  | N | U | U | U | U | U |  | N |  |  |  |  |
| `maintenance.create` — Raise a maintenance request |  |  |  | U |  | U | U |  |  |  |  |  |  |
| `maintenance.process` — Validate, refer to workshop, record progress and completion |  |  |  |  |  |  | U |  |  |  |  |  |  |
| `maintenance.verify` — Verify completed maintenance and close |  |  |  |  |  |  | U |  |  |  |  |  |  |
| `service.record` — Record vehicle service history |  |  |  |  |  |  | U |  |  |  |  |  |  |
| `asset.view` — View general asset register |  | N | U | U | U | U |  | U | N |  |  |  |  |
| `asset.register` — Register an asset in an approved category |  |  |  |  |  |  |  | U |  |  |  |  |  |
| `asset.custody` — Issue, return and transfer assets |  |  |  |  |  | U |  | U |  |  |  |  |  |
| `asset.inspect` — Record inspection / condition |  |  |  |  |  | U |  | U |  |  |  |  |  |
| `asset.dispose` — Record approved disposal |  |  |  |  |  |  |  | U |  |  |  |  |  |
| `report.view` — View management reports | N | N | U | U | U | U | U | U | N |  |  |  |  |
| `report.export` — Export an approved report definition (audited) | N | N | U |  | U |  | U | U |  |  |  |  |  |
| `audit.view` — Search audit events |  |  |  |  |  |  |  |  | N |  | N |  |  |
| `audit.export` — Export audit evidence |  |  |  |  |  |  |  |  | N |  |  |  |  |
| `security.view` — View security events and access-control activity |  |  |  |  |  |  |  |  |  |  | N |  |  |
| `platform.view` — View system health and configuration |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `platform.configure` — Change non-security application settings |  |  |  |  |  |  |  |  |  | N |  |  |  |
| `workflow.view` — View workflow definitions | U | U |  |  |  |  |  |  | U | U |  |  |  |
| `contact.view` — View messages submitted through the public Contact page |  | N |  |  |  |  |  |  |  | N |  |  |  |
| `contact.manage` — Mark public contact messages as handled |  | N |  |  |  |  |  |  |  | N |  |  |  |

## Role catalogue

| Code | Name | Category | Dashboard | Assignable at | Time-limited | Description |
|---|---|---|---|---|---|---|
| `DIG_OPS_EXECUTIVE` | DIG Operations Executive | BUSINESS | National Operations Executive Dashboard | SERVICE_HQ | No | National aggregate oversight; approves HQ-level matters only where a recorded delegation exists. No unrestricted record-level access. |
| `HQ_OPS_COORDINATOR` | HQ Operations Coordinator / Secretariat Officer | BUSINESS | National Operations Coordination Workspace | SERVICE_HQ | No | Coordinates national administrative registers and queues; processes requests within assigned delegated authority. |
| `PROVINCIAL_COMMANDER` | Provincial Division Commander | BUSINESS | Provincial Division Command Dashboard | PROVINCIAL_DIVISION | No | Own division only. Approves, returns or rejects within formally delegated authority (delegation record required). |
| `DIVISION_STAFF_OPS` | Division Staff Ops | BUSINESS | Division Operations Staff Workspace | PROVINCIAL_DIVISION | No | Prepares and tracks divisional administrative submissions and registers. No approval authority unless a separate delegation is recorded. |
| `FORMATION_COMMANDER` | Formation Commander | BUSINESS | Divisional Formation Command Dashboard | FORMATION | No | Own formation only. Approves within delegated authority. |
| `FORMATION_ADMIN_OFFICER` | Formation Administrative Officer | BUSINESS | Formation Administration Workspace | FORMATION | No | Registers and tracks formation requests; updates assigned general asset registers. No assumed approval powers. |
| `FLEET_OFFICER` | Fleet Officer | FUNCTIONAL | Fleet and Transport Management Workspace | SERVICE_HQ, PROVINCIAL_DIVISION, FORMATION | No | General fleet administration for granted organisations only. No GPS, location, routes, mission purpose or deployment history. |
| `ASSET_CUSTODIAN` | General Asset Custodian | FUNCTIONAL | Assets and Equipment Workspace | SERVICE_HQ, PROVINCIAL_DIVISION, FORMATION | No | Non-sensitive general assets in approved categories only. Firearms, ammunition and controlled equipment are excluded. |
| `INTERNAL_AUDITOR` | Internal Auditor | AUDIT | Audit and Compliance Workspace | SERVICE_HQ, PROVINCIAL_DIVISION, FORMATION | Yes (≤180 days) | Read-only, time-limited audit scope. Cannot modify any business record. |
| `PLATFORM_ADMIN` | Platform Administrator | TECHNICAL | Platform Administration Workspace | SERVICE_HQ | No | Technical configuration and approved user provisioning. No business-record access by default. |
| `SECURITY_ADMIN` | Security Administrator | SECURITY | Security Administration Workspace | SERVICE_HQ | No | Security events, access recertification, suspension and revocation. No routine business approval. |
| `ORG_REGISTRY_ADMIN` | Organisational Registry Administrator | BUSINESS | Organisation and Formation Administration | SERVICE_HQ | No | Proposes effective-dated structural changes. Cannot approve own proposals. |
| `OPERATIONS_STAFF` | Authorised Operations Staff | BUSINESS | My Operations Workspace | SERVICE_HQ, PROVINCIAL_DIVISION, FORMATION | No | Restricted role: create and track own unit's administrative requests only. |
