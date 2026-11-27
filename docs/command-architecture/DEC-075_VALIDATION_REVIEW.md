# DEC-075 — Command Structure, Channels and Office-to-Role Mappings: Validation Review

Prepared 27 November 2026 for v0.11.0 at the project owner's request: "validate professionally like a Director of Administration and Human Resource of the Zambia Police Service".

> **Status of this document.** This is an **advisory pre-validation review** prepared by the development team. It applies the method a Director of Administration and Human Resource would use: establishment, rank-to-appointment fit, span of command, unity of command, least privilege. **It is not an institutional validation.** Nothing here is, or implies, a decision of the Zambia Police Service. Formal validation requires the signatures in §6 from authorised officers. Until then, DEC-075 remains *requires institutional validation*.

## 1. Method

Each office, relationship and mapping in the synthetic configuration was checked against:
1. **the owner's directive** (what was supplied, and what was inferred to fill gaps);
2. **establishment logic**: does the office sit on the right organisational unit, at a rank consistent with the appointment?
3. **unity of command**: one primary commander per office, with parallel lines limited to reporting or coordination;
4. **least privilege**: an application role must give only the access the office needs.

Findings are classified as follows:

| Code | Meaning | Action |
|---|---|---|
| **S** | Supplied verbatim by the owner's directive | Recommend confirming as supplied |
| **C** | Inferred, consistent with standard police administrative practice | Recommend accepting, subject to confirmation |
| **Q** | Inferred or ambiguous; a Service decision is needed | Decision required before production |
| **R** | Inferred, and the review recommends a change | Change made in v0.11.0 (described) |

## 2. National hierarchy

| # | Item as configured | Code | Review finding | Recommendation |
|---|---|:-:|---|---|
| H-1 | IG is the highest authority; no superior office | S | Consistent with the Service's constitutional head | Confirm |
| H-2 | DIG Operations → IG | S | — | Confirm |
| H-3 | DIG Administration and DIG Special Duties → IG, with no Operations relationships and no holder in ZPS-OMS | S | Correct separation: they acquire no Operations authority. Note: DIG Administration is the natural owner of HR establishment data; ZPS-OMS does not give that office HR functions | Confirm; decide later whether DIG Administration needs read access to establishment reports |
| H-4 | Commissioner – Operations HQ → DIG Operations | S | — | Confirm |
| H-5 | Deputy Commissioner → Commissioner; acts only under an acting appointment | S | Sound practice: deputies exercise authority only when formally designated | Confirm |
| H-6 | Provincial Division commanders (Copperbelt, Lusaka) → Commissioner – Operations HQ | **Q** | Supplied for the Mobile Unit (channel B) but **inferred for Provincial Divisions**. In substantive command, Provincial Commanding Officers are senior officers who may answer to the IG through the DIGs rather than to a Commissioner at HQ. In ZPS-OMS the link is an Operations-administration line, not substantive command, but it decides who can instruct a Province | Decide whether Provincial Divisions take Operations instructions from the Commissioner – Operations HQ or directly from DIG Operations. One relationship row per Division |

## 3. Mobile Unit structure and the Area Commander

| # | Item as configured | Code | Review finding | Recommendation |
|---|---|:-:|---|---|
| MU-1 | Constable → Sergeant → Inspector → Chief Inspector (Section/Platoon Commander) → Area Commander | S | Matches the supplied chain and normal rank progression | Confirm |
| MU-2 | Inspector placed at 1 Section; Chief Inspector at 1 Platoon | **Q** | Inferred placement. The title "Chief Inspector — Section/Platoon Commander" means a Chief Inspector may command either a section or a platoon. In many establishments a section is led by a Sergeant or Inspector and a platoon by an Inspector or Chief Inspector | Supply the Mobile Unit establishment table (rank per section, platoon, detachment, company) so offices sit on the correct units |
| MU-3 | Area Commander office placed on A Company | **Q** | Inferred. An "area" may be a company's deployment area, a detachment, or a separate deployment command drawing on several companies. The office's unit determines the scope of any role its holder receives | Confirm what an "area" is. If it is not a company, add Areas to the organisation register as their own units (structure change through Module 01), then move the office |
| MU-4 | Area Commander's primary superior is Staff II (Staff II → Staff I) | S / Q | Part 5.1 places Staff II directly above the Area Commander, but Part 6.2 says "Staff I or Staff II according to the configured reporting arrangement" | Confirm Staff II, or change to Staff I (one relationship row) |
| MU-5 | Channel A: Area Commander → District Operations Officer and → Officer Commanding District, as parallel recipients | S | Both receive the same report with separate acknowledgements, as required | Confirm |
| MU-6 | The District Operations Officer may give the Area Commander **administrative instructions and operations administrative tasks** (administrative coordination); the OC District receives reports only | **Q** | Inferred from Part 6.4, which expects "conflicting tasking requirements" from the parallel channel, which is only possible if channel A can task. The HR concern is dual tasking: a formation officer receiving work from territorial district staff. The model contains it: coordination cannot issue formal directives or personnel assignments, and conflicts go to the common superior | Decide whether the District Operations Officer may task the Area Commander at all. If not, change that row to parallel reporting only; conflicts then cannot arise from channel A |
| MU-7 | Staff I → Divisional Commander; Staff II → Staff I; Formation Operations Staff Administrator → Staff I | S / C | Staff lines are supplied. The administrator's line under Staff I is inferred and conventional | Confirm |
| MU-8 | Deputy Division Commander acts for the Divisional Commander only under an acting appointment | S | — | Confirm |

## 4. Office-to-role mappings

A mapping records which of the 31 application roles the holder of an office would normally need. **It grants nothing by itself.**

| # | Office | Proposed role | Code | Review finding | Recommendation |
|---|---|---|:-:|---|---|
| M-1 | Divisional Commander / Formation Commanding Officer | 09 Formation Commanding Officer | C | The role is defined as commanding officer of a Division or Formation, so the fit is good. The Mobile Unit head's official title should be confirmed | Accept, subject to the title |
| M-2 | Staff I, Staff II | 11, 12 (same titles) | S | Identical titles and functions | Accept |
| M-3 | **Area Commander** | ~~13 Company Commander~~ → **not mapped** | **R** | **Withdrawn.** The Company Commander role is scoped to one company's personnel and contributions. An Area Commander may command elements of several companies deployed to an area, so the role could give too little (other companies' personnel) or the wrong thing (administrative company duties). Mapping it would also have conflated two distinct appointments, which the directive forbids | **Changed in v0.11.0** (migration 015). The office now shows "not mapped: to be decided by the Service". Options: (a) where the area *is* one company, the Company Commander holds the Area Commander appointment as well; (b) the Area Commander receives an existing role at the Area's own unit once Areas are registered (MU-3); (c) if neither fits, the owner decides whether to extend the 31-role catalogue. That is a catalogue change and needs an explicit decision |
| M-4 | Section/Platoon Commander (Chief Inspector) | 14 Section Head | C | The Section Head role covers "section, platoon, detachment or department", which fits a section or platoon commander | Accept, subject to MU-2 |
| M-5 | Inspector | 14 Section Head | **Q** | Fits only if the Inspector **commands** the section. If a Chief Inspector commands it and the Inspector is second-in-command, the Section Head role would give a subordinate the commander's register and contribution access. That fails least privilege | Decide per establishment. Where the Inspector is not the section's commander, give no role. The Inspector is deliberately **not** an appointment-only office type, so such an Inspector would need a decision before getting command access |
| M-6 | Sergeant, Police Officer / Constable | none, appointment-only (DEC-076) | S | Owner direction 27 Nov 2026. Access is limited to the officer's own directives and reports. The office types are explicit (Sergeant, Constable) and governed on the platform console; production requires a Service decision reference | Confirm, and record the Service decision reference when enabling in production |
| M-7 | OC District, Deputy OC, Operations Officer, OIC Station, Station Inspector, Station Administrator | roles 21, 22, 23, 27, 28, 29 (same titles) | S / C | Same-titled roles, consistent | Accept |

## 5. Conflict resolution

| # | Item | Code | Review finding | Recommendation |
|---|---|:-:|---|---|
| CF-1 | Conflicts are referred to the nearest common superior office (for a Mobile Unit area versus Kitwe District, the Commissioner – Operations HQ) | **Q** | Mechanically correct. Administratively, many services first refer a dispute between a deployed formation element and a territorial district to the Provincial Commanding Officer of the Province, keeping it out of national HQ | Decide the referral level. Today the system always uses the nearest common superior office. A configured referral office (for example "conflicts in this Province go to the Provincial Commanding Officer") would be a small, not yet implemented change, made once the Service decides |
| CF-2 | No automatic precedence | S | Required by the directive | Confirm |

## 6. Formal validation (to be completed by authorised officers)

| Item group | Decision (confirm / change / reject) | Name, rank and appointment | Signature | Date | Reference |
|---|---|---|---|---|---|
| National hierarchy (H-1 … H-6) | | | | | |
| Mobile Unit structure (MU-1 … MU-8) | | | | | |
| Office-to-role mappings (M-1 … M-7) | | | | | |
| Conflict referral (CF-1, CF-2) | | | | | |
| Appointment-only access in production (DEC-076) | | | | | |

When a group is signed, record the reference in DEC-075. Apply any changes through the command structure page (relationships, appointments) or a structure change (new Area units). Set `mapping_validated` on each validated mapping, so later corrections never overwrite a validated decision.

## 7. Changes made as a result of this review

| Change | Where |
|---|---|
| Area Commander → Company Commander proposal withdrawn; the office is shown as "not mapped: to be decided by the Service" | `POSITION_TYPES` (`mappingNote`), migration 015 (clears only unvalidated proposals) |
| Appointment-only eligibility made **explicit** (Sergeant, Constable) instead of "any office without a mapped role". Otherwise the unmapped Area Commander office would have become appointment-only by default, a privilege escalation the review caught | `APPOINTMENT_ONLY_ELIGIBLE`; tests `appointment-access` |
| Structure page distinguishes "appointment-only rank" from "not mapped: to be decided" | `/app/command/structure` |
