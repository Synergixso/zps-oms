-- ZPS-OMS migration 016 — Kamfinsa Mobile Unit established structure (institutional compliance directive, 28 Nov 2026, Part V).
--
-- Adds the administrative DUTY STATION of an organisational unit: the town or camp where the unit is based, e.g.
-- "Kitwe, Copperbelt Province" for HQ 5 Detachment. It is organisational metadata, never a tracked, live or tactical
-- position (CLAUDE.md exclusions). Additive only: no existing row is changed by this migration. The established
-- Companies, Detachments and command offices are loaded by seed step 016 in development, and through the organisation
-- registry elsewhere.

ALTER TABLE org_units ADD COLUMN duty_station VARCHAR(120) NULL AFTER short_name;
