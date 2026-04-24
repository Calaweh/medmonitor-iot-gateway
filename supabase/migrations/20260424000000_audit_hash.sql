-- ============================================================
-- Add Hash Chaining to Audit Log for IEC 62304 / HIPAA compliance
-- ============================================================

ALTER TABLE audit_log
ADD COLUMN previous_hash VARCHAR(64),
ADD COLUMN hash VARCHAR(64);

-- Index for fast sequential traversal/verification
CREATE INDEX IF NOT EXISTS idx_audit_log_hash ON audit_log (hash);