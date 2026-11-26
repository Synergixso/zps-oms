-- ZPS-OMS migration 011 — serialised audit-chain appends (fixes forks under concurrent writes, DEC-064).
-- One row holds the hash of the last appended event; audit() locks it (SELECT ... FOR UPDATE) in the same transaction as
-- the insert, so concurrent appends queue instead of chaining onto the same predecessor. Existing events are untouched.
CREATE TABLE audit_chain_head (
  id        TINYINT  NOT NULL PRIMARY KEY CHECK (id = 1),
  last_hash CHAR(64) NOT NULL,
  last_seq  BIGINT   NULL
) ENGINE=InnoDB;

INSERT INTO audit_chain_head (id, last_hash, last_seq)
SELECT 1, COALESCE((SELECT hash FROM audit_events ORDER BY seq DESC LIMIT 1), REPEAT('0', 64)), (SELECT MAX(seq) FROM audit_events);
