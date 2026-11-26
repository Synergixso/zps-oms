-- ZPS-OMS migration 003 — configuration: a Division/Formation may be administered by another formation
-- (e.g. a specialised unit placed under a support formation). Parent/child pairs remain configurable data.
INSERT IGNORE INTO org_type_rules (parent_type, child_type) VALUES ('FORMATION', 'FORMATION');
