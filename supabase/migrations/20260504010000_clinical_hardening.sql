-- =============================================================================
-- Migration: 2026050401_clinical_hardening.sql
-- Description: Adds Alert Acknowledgement workflow and Device Health monitoring
-- =============================================================================

-- 1. Alert Acknowledgement Workflow (IEC 60601-1-8 Compliance)
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id);

-- 2. Device Health Monitoring
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 3. Update comments for documentation
COMMENT ON COLUMN alerts.acknowledged_at IS 'Timestamp when a clinician first acknowledged the alert (stops alarm)';
COMMENT ON COLUMN alerts.acknowledged_by IS 'The clinician who acknowledged the alert';
COMMENT ON COLUMN devices.last_seen_at IS 'Last time telemetry was received from this device (heartbeat)';
