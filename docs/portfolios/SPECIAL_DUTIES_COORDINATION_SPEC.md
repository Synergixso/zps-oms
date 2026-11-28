# DIG Special Duties / State House — coordination specification

Final master directive, Part D §5.6 and Part E (28 Nov 2026). Implemented in v0.15.0 (`src/server/domain/coordination.ts`, DEC-088).

## 1. Position in the structure
- The **Deputy Inspector General of Police – Special Duties / State House** (`pos_dig_sd`) is a separate executive portfolio reporting directly to the Inspector General (official website R3; Appendix A as cited by the stakeholders). It is not placed under DIG Operations or DIG Administration, and neither of them can instruct it (`portfolios` test).
- It has no application role among the 31; its appointee holds the office (executive appointment, DEC-088): its own command and reporting with the IG, coordination requests, and its portfolio dashboard. It sees no Operations, Administration, personnel or training records.

## 2. Coordination request
| Element | Content |
|---|---|
| Parties | Requesting office and receiving office, both among: IG, DIG Operations, DIG Administration, DIG Special Duties / State House, Commissioner – Operations HQ, Deputy Commissioner – Operations HQ |
| Category | Provision of authorised Police personnel; administrative support; training coordination; administrative information; other |
| Content | Subject, administrative requirement (≤ 500 characters), officers required (number), authorisation reference, required-by date |
| Workflow | SUBMITTED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED, or DECLINED (receiver, with a note) / CANCELLED (requester, with a note); every step in `coordination_events` and the audit chain; the other party is notified |
| Authority | A request is **not** an instruction. It confers no command authority; the receiving office keeps its mandate and decides. Only the receiving office acts on it; only the requesting office cancels it |
| Visibility | The two offices and the Inspector General (oversight). Everyone else, including the third DIG, gets a neutral not-found (`portfolios` test) |
| Excluded content | Protection plans, VVIP schedules, routes, itineraries, motorcades, convoys, movements, escort plans, safe houses, vulnerabilities, threat assessments, protective intelligence. There are no fields for them, and the text screen refuses such terms in addition to the general excluded list |

## 3. Typical use
DIG Operations is asked to facilitate the provision of authorised Police personnel for a State House ceremonial occasion: DIG Special Duties (or DIG Operations) raises a PERSONNEL_SUPPORT request with the number of officers and the authorisation reference; the receiving office acknowledges, records administrative progress and confirms completion. The personnel themselves are provided through the ordinary manpower and assignment modules of the responsible formations; no protection details enter ZPS-OMS.

## 4. Acceptance
- One record per request with traceable history and restricted recipients — verified.
- The receiving office acts; the requester cannot acknowledge its own request — verified.
- Protection and movement terms refused — verified.
- No directive is created between DIG offices by a coordination request — verified.
- Institutional validation of this arrangement belongs with the DEC-075 sign-off (issue #7).
