# Architecture Decisions (summary)

The authoritative register is `docs/DECISION_REGISTER.md`. Key decisions governing the current architecture:

| Decision | Summary |
|---|---|
| DEC-030 | MySQL via XAMPP with `mysql2` and raw parameterised SQL; no ORM, because a tested data layer already existed |
| DEC-031 | Password authentication replaces the role simulator; IdP/SSO and MFA to follow approval |
| DEC-032 | Hierarchical tenancy: national, ten provincial, formation tenants; closure table |
| DEC-033 | 41-role catalogue with UNIT / SUBTREE / NATIONAL coverage |
| DEC-034 | Manpower, roster and assignment modules in scope (administrative records only) |
| DEC-037 | One project folder for the public website and the back office |
| DEC-038 | Approval authority = delegation at the unit or an ancestor + business role there |
| DEC-039 | Official System Login page with documented honest deviations (SSO disabled, username field) |
| DEC-040 | Incremental synthetic seed steps; never destroy data |
| DEC-041 | Tenure 365 days, renewal 365, review window 30, exception categories — provisional settings |
| DEC-042 | Immutable roster versions; finalisation creates assignments in one transaction |

Open decisions for the Service: exact tenure and renewal rules; which offices hold MANPOWER / ASSIGNMENT delegations at each level; rank list and personnel categories; official operational-area list; service-number sign-in and SSO provider; least-privilege database account.
