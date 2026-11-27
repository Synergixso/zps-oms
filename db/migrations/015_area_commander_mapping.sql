-- ZPS-OMS migration 015 — DEC-075 review, item M-3 (27 Nov 2026).
--
-- The proposed correspondence "Area Commander → Company Commander role" is withdrawn: an Area Commander commands the
-- Mobile Unit elements deployed to an area (possibly several companies), while the Company Commander role is scoped to
-- one company. The mapping is informational only (it never conferred authority); it is now left undecided for the
-- Service. Only UNVALIDATED proposals are cleared; a mapping the Service has validated is never touched.
-- No authority, appointment, relationship or record changes.

UPDATE command_positions SET mapped_role_code = NULL
 WHERE position_type = 'AREA_COMMANDER' AND mapped_role_code = 'COMPANY_COMMANDER' AND mapping_validated = 0;
