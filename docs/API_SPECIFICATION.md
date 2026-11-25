# API Specification — ZPS-OMS (prototype)

The prototype exposes **no public JSON API**. All mutations are Next.js server actions (POST, same-origin enforced by Next.js), and two CSV export route handlers. All inputs are validated with Zod in the domain layer and all authorisation is evaluated server-side from the session.

## Common contract
- **Authentication:** `zps_session` cookie (HttpOnly, SameSite=Strict, Secure in production). Missing/expired → redirect to `/login`.
- **Result (`ActionState`):** `{ ok?: boolean, message?: string, error?: string, fieldErrors?: Record<string,string> }`.
- **Error codes (domain):** `FORBIDDEN` (audited DENIED), `NOT_FOUND` (also used for out-of-scope records), `INVALID`, `CONFLICT` (state/concurrency), `UNAUTHENTICATED`.
- Never accepted from the client as authority: user id, role, org scope, permission. `originOrgId`, `custodyOrgId` etc. are accepted only as *requests* and re-checked against the actor's scope.

## Server actions (`src/server/actions/*`)
| Action | Domain call | Inputs | Notes |
|---|---|---|---|
| `demoSignIn(fd)` | `createSession` | userId | Synthetic accounts only; disabled when `ZPS_DEMO_AUTH=off` |
| `signOut()` | `destroySession` | — | |
| `createRequestAction` | `createDraft` (+`SUBMIT`) | categoryCode, title, details, priority, originOrgId?, intent | Redirects to detail |
| `updateRequestAction` | `updateDraft` | id, title, details, priority | Author, DRAFT/RETURNED |
| `requestWorkflowAction` | `performAction` | id, action ∈ {SUBMIT, ASSIGN, APPROVE, RETURN, REJECT, START, COMPLETE, CLOSE, CANCEL, REOPEN}, reason?, assigneeId?, version | Optimistic lock |
| `createVehicleAction` / `updateVehicleAction` | `createVehicle` / `updateVehicleAdmin` | fleet fields | |
| `recordServiceAction` | `recordService` | vehicleId, serviceDate, serviceType, refs, notes | |
| `createMaintenanceAction` / `maintenanceWorkflowAction` | `createMaintenance` / `maintenanceAction` | vehicleId…, action ∈ {VALIDATE, APPROVE, REJECT, REFER, START, SUBMIT_COMPLETION, RETURN_TO_WORKSHOP, VERIFY} | |
| `registerAssetAction` / `assetWorkflowAction` | `registerAsset` / `assetAction` | action ∈ {ISSUE, RETURN, TRANSFER, RECEIVE, INSPECT, SEND_REPAIR, REPAIRED, DISPOSE} | |
| `proposeChangeAction` / `decideChangeAction` | `proposeChange` / `decideChange` | change fields / id, decision, reason, approvalRef | |
| `provisionUserAction`, `assignRoleAction`, `revokeAssignmentAction`, `grantDelegationAction`, `revokeDelegationAction`, `setUserStatusAction`, `openReviewAction`, `decideReviewItemAction` | `iam.ts` | | Never self |
| `markAllReadAction` | SQL scoped to caller | — | |

## Route handlers
| Method & path | Permission | Request | Response |
|---|---|---|---|
| `POST /app/reports/{code}/export` | `report.export` + report domain | form `fields[]` (subset of definition) | `text/csv` attachment, `Cache-Control: no-store`; error → 303 back with message |
| `POST /app/audit/export?q&category&outcome&from&to` | `audit.export` | — | `text/csv` attachment; 403/400 on error |

Both check `Origin` host equals `Host` (CSRF) before any processing.

## Domain service contracts
Typed TypeScript functions in `src/server/domain/*` taking `(db, actor, …)`. They are the stable seam for a future REST/OpenAPI layer (versioned `/api/v1`), which is deferred until an integration is approved (NFR-009).
