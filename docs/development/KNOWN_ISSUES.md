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
| 12 | ~~Historical audit-chain breaks in the local dev database~~ — resolved 26 Nov 2026: with the owner's approval the synthetic dev database was backed up (`backups/zps_oms_dev_pre_reset_*.sql`) and re-created; the new chain verifies with 0 content and 0 link breaks (`npm run verify:audit`) | — | — |
| 13 | Migration 012 was applied to the development database by a dev-server reload before the usual pre-migration backup was taken | None found: 012 is additive (four new tables, three settings); all existing records verified intact; a backup of the post-migration state was taken (`backups/zps_oms_dev_post012_*.sql`) | Practice changed: take the backup before writing a migration file while the dev server runs |
| 14 | `style-src` still allows `'unsafe-inline'` | Low (styles cannot run code) | Convert React style attributes to classes if the Service's assessment requires it |
| 15 | A development server (`next dev`) left running for many hours of hot reloads and thousands of route compilations grew to 4.4 GB of private memory on the 8 GB development laptop and paged heavily, slowing the route audit to about 3 s per request (27 Nov 2026) | Development only; production uses `next build` / `next start` | Restart the development server before long verification runs (route audit, full browser suite); the verification procedure now does so |
| 16 | The command structure (offices, relationships, channels, precedence) and the office-to-role mappings are synthetic configuration | Must not be used for real command until validated | Service to validate (DEC-075); appointment-only access needs an owner decision (DEC-076) |
| 11 | The GitHub Actions workflow (0.7.0) has not yet been observed running on GitHub: the repository is private and this environment has no GitHub access. Its steps were verified locally (type check, 127 tests in strict SQL mode, warning-free build, `npm audit` clean) | The first runs may need small adjustments | Owner to open the Actions tab after the push and share any failure |
