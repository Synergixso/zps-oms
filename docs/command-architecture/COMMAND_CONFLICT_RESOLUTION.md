# Command Conflict Resolution

Recorded 27 November 2026 for v0.11.0 (owner directive Part 6.4; DEC-075). Implementation: `command_conflicts`, `command.ts` (`flagConflict`, automatic detection, `commonSuperior`, `resolveConflict`), pages `/app/command/conflicts`.

## 1. Principle

ZPS-OMS never decides which of two conflicting instructions prevails. It records where each instruction came from and refers the conflict to the designated common superior, then records that office's decision. Both directives stay exactly as they were until then.

## 2. Flow

| Step | Who | What is recorded |
|---|---|---|
| Flag (recipient) | Holder of the office that received both directives | Both directives must be open, addressed to that office and from **different** issuing offices; a description is required |
| Flag (automatic) | System | When an office receives open directives about the **same related record** (manpower request, assignment or transfer reference) from different issuing offices |
| Referral | System | Common superior = the nearest office in both issuing offices' primary command chains (an issuing office counts as its own chain head). Its holders are notified; both directives get a CONFLICT history event |
| Decision | Holder of the common superior office (or an acting officer with *decide conflicts*) | Directive A precedes / directive B precedes / both stand / withdraw A / withdraw B, with reasons. A withdrawal cancels that directive with a history event |
| Notification | System | The receiving office and both issuing offices |

Neither issuing office can decide, and a parallel recipient gains no authority from receiving reports. If no common superior is configured, the conflict stays open and the structure must be corrected.

## 3. Example (Test H)

Staff II (channel B) issues an operations administrative task to the Area Commander, and the District Operations Officer (channel A) issues an administrative instruction for the same day. The Area Commander flags the conflict and the system refers it to the Commissioner – Operations HQ, the nearest office common to both chains. Staff II and the Operations Officer are both refused when they try to decide. The Commissioner withdraws the district instruction with reasons; it is cancelled and the formation task stays open.

## 4. Institutional validation needed

Precedence rules and conflict-resolution delegation (for example whether a Provincial Commander should decide conflicts between a Mobile Unit area and a District in that Province) must be validated by the Service. The configurable structure supports either answer.
