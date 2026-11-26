# Known Issues

| # | Issue | Impact | Plan |
|---|---|---|---|
| 1 | Local MySQL uses XAMPP `root` without a password | Acceptable only for local synthetic review | Ready-made script `db/admin/create_app_user.sql` (least-privilege `zps_oms_app` and read-only accounts, root password); the owner runs it with their own passwords and updates `.env.local` |
| 2 | ~~No job runner~~ — resolved in 0.4.0 (automation engine) | — | — |
| 3 | Manpower approval chains are configurable (0.4.0); assignment, exception and transfer decisions remain delegation-routed single decisions | Adding a second level there needs a code change | Configurable chains for assignment decisions |
| 4 | Most permissions are module verbs; transfer and renewal are now separate (0.4.0); approvals are delegation-controlled rather than permissions | Some §7.2 names map to an equivalent rather than an identical permission (see RBAC_PERMISSIONS.md) | Further splits as the Service requires |
| 5 | No scheduled report delivery (saved custom reports exist since 0.4.0) | Reports are run on demand | Scheduled delivery as an automation job |
| 6 | Excel output is CSV (rosters also have a server-generated PDF since 0.4.0) | Opens in Excel; no native .xlsx | Evaluate a free .xlsx writer if required |
| 7 | Sign-in by username only; SSO shown as unavailable | As documented in DEC-039 | Awaiting institutional decisions |
| 8 | The dev server can reset connections under heavy concurrent compilation (route audit) | Audit retries requests | None needed for production builds |
| 9 | Hydration warning in development caused by browser extensions (Grammarly attributes) | None | — |
| 10 | Back office visual design not yet aligned with the owner's dashboard mockup | Usability | UI/UX phase |
