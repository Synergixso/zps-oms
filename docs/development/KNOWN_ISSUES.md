# Known Issues

| # | Issue | Impact | Plan |
|---|---|---|---|
| 1 | Local MySQL uses XAMPP `root` without a password | Acceptable only for local synthetic review | Ready-made script `db/admin/create_app_user.sql` (least-privilege `zps_oms_app` and read-only accounts, root password); the owner runs it with their own passwords and updates `.env.local` |
| 2 | ~~No job runner~~ — resolved in 0.4.0 (automation engine) | — | — |
| 3 | ~~Assignment and transfer decisions single-level~~ — resolved in 0.6.0 (configurable chains for assignment approval and transfer release). Exception and renewal decisions remain single delegated decisions | Low | Extend the same chain model if the Service requires it |
| 4 | Most permissions are module verbs; transfer and renewal are now separate (0.4.0); approvals are delegation-controlled rather than permissions | Some §7.2 names map to an equivalent rather than an identical permission (see RBAC_PERMISSIONS.md) | Further splits as the Service requires |
| 5 | ~~No scheduled report delivery~~ — resolved in 0.6.0 (in-application delivery; no e-mail by design, DEC-013) | — | — |
| 6 | ~~Excel output is CSV~~ — resolved in 0.6.0 (dependency-free .xlsx writer for reports and rosters; validated by ZIP/CRC and XML checks, not yet opened in a licensed Excel installation) | Low | Owner to confirm the files open as expected in their Excel version |
| 7 | Sign-in by username only; SSO shown as unavailable | As documented in DEC-039 | Awaiting institutional decisions |
| 8 | The dev server can reset connections under heavy concurrent compilation (route audit) | Audit retries requests | None needed for production builds |
| 9 | Hydration warning in development caused by browser extensions (Grammarly attributes) | None | — |
| 10 | ~~Back office not aligned with the owner mockup~~ — resolved (v0.4.x redesign; 27 role workspaces in 0.5.x) | — | — |
