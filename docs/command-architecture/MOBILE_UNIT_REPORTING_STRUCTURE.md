# Mobile Unit Reporting Structure

Recorded 27 November 2026 for v0.11.0 (owner directive Part 6; DEC-075). Synthetic configuration from seed step 014; it requires institutional validation before production use.

## 1. Junior personnel to Area Commander (primary command)

| Office (synthetic holder) | Unit | Reports to | Relationship |
|---|---|---|---|
| Police Officer / Constable (`demo.mu.constable`) | 1 Section, 1 Platoon | Sergeant | Primary command |
| Sergeant (`demo.mu.sergeant`) | 1 Section | Inspector | Primary command |
| Inspector (`demo.mu.sec.commander`) | 1 Section | Section/Platoon Commander | Primary command |
| Section/Platoon Commander, Chief Inspector (`demo.mu.plt.commander`) | 1 Platoon | Area Commander | Primary command |
| Area Commander (`demo.mu.acoy.commander`) | A Company area (Kitwe) | see §2 | — |

Each relationship records the reporting office, the receiving superior office, the current appointments, the unit, the relationship type, the effective date and the authorising reference. When personnel or appointments change, the old appointment is ended (not deleted) and the relationship stays on the office, so history is preserved.

## 2. Area Commander: two parallel channels

```
                        ┌──────────── CHANNEL B — Mobile Unit formation command (primary) ────────────┐
Area Commander ──────▶  Staff II ─▶ Staff I ─▶ Divisional Commander ─▶ Commissioner Ops HQ ─▶ DIG Ops ─▶ IG
      │                 (Deputy Division Commander and Deputy Commissioner only when acting)
      │
      ├──── CHANNEL A — Area / District administrative coordination ────┐
      │        Operations Officer, Kitwe District   (administrative coordination: may give
      │                                             administrative instructions; receives reports)
      └──────  Officer Commanding, Kitwe District   (parallel reporting: receives reports only)
```

| Relationship row | Type | Channel | Effect |
|---|---|---|---|
| Area Commander → Staff II | Primary command | B | Staff II may issue any directive category; Staff II is the primary report recipient; reports are forwarded up channel B |
| Area Commander → District Operations Officer | Administrative coordination | A | May issue administrative instructions and operations administrative tasks (not formal directives or personnel assignments); receives reports as a parallel recipient |
| Area Commander → OC District | Parallel reporting | A | Receives reports as a parallel recipient; **no** instruction authority |

The directive says the Area Commander reports to "Staff I or Staff II according to configuration". The synthetic configuration uses Staff II, following the directive path in Part 5.1, which has Staff II directly above the Area Commander. Changing it to Staff I means editing one relationship row.

## 3. One report, separate acknowledgements

When the Area Commander submits a report, ZPS-OMS creates **one** `status_reports` row (one reference, one body, one originator, one originating unit). It also creates one `report_recipients` row per office: Staff II (primary), the District Operations Officer (parallel) and the OC District (parallel). Each office acknowledges and reviews separately. Only the primary chain returns, forwards or closes the report, and parallel recipients never forward it along the other channel (Test E).

## 4. Conflicting tasking

Staff II (channel B) and the District Operations Officer (channel A) can both task the Area Commander. If their instructions conflict, the Area Commander refers them as a conflict. The system then routes it to the nearest common superior office (here the Commissioner – Operations HQ) and changes neither directive until that office decides (Test H). See `COMMAND_CONFLICT_RESOLUTION.md`.
