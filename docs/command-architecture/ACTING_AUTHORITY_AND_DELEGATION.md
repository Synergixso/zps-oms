# Acting Authority and Delegation

Recorded 27 November 2026 for v0.11.0 (owner directive Part 5.2; DEC-077). Implementation: `acting_appointments`, `command.ts` (`appointActing`, `revokeActing`, `officesHeld`, `authorityFor`), page `/app/command/acting`.

## 1. Principle

Being a deputy does not make any decision-making permission active. The Deputy Commissioner, the Deputy Division Commander and Staff II act for their principals **only** under a recorded acting appointment. That appointment lists the delegated actions and runs between two dates. When it expires or is revoked, the ordinary configuration applies again without any further step, because authority is evaluated against the current date on every request.

## 2. Record

| Field | Meaning |
|---|---|
| Office | The command position acted in |
| Original office holder | The substantive holder at the time (or vacant) |
| Acting office holder | The officer acting |
| Organisational scope | The office's unit (an office belongs to one unit) |
| Authorising officer | Who recorded it: the substantive holder of the office, or the holder of an office above it in the command chain |
| Authorising reference | The instrument (for example HQ/OPS/ACT/014) |
| Effective and expiry dates | At most 180 days; a new appointment extends it |
| Delegated actions | Any of: issue directives, assign or forward directives, acknowledge, review reports, submit reports, close or cancel directives, decide conflicts, appoint acting officers |
| Revocation | Who revoked it and when |
| Audit history | `command.acting.appoint` / `command.acting.revoke` events with all of the above |

## 3. Rules

- Every directive, step, review and decision records whether it was taken under SUBSTANTIVE or ACTING authority, with the acting appointment.
- A holder cannot appoint themselves to act in their own office.
- Technical administrators and liaison officers cannot act in command offices (or be appointed to them).
- Only the authorising officer, the office holder or a superior may revoke.

## 4. Evidence

Test G covers the following:
- the Deputy Commissioner has no Commissioner authority until appointed;
- with *acknowledge* and *review* delegated, they still cannot issue directives as the Commissioner;
- the Deputy Division Commander issues a directive as the Divisional Commander with *issue* delegated, and the directive records ACTING;
- Staff II can act for Staff I only after delegation, and only for the delegated action;
- a junior officer cannot appoint acting officers for a senior office;
- a technical administrator cannot act;
- expiry and revocation each remove the authority.
