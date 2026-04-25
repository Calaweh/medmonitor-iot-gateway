-- ============================================================
-- Device Calibration Tracking (S6 - Polish)
-- ============================================================

CREATE TABLE IF NOT EXISTS calibration_records (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    calibrated_at TIMESTAMPTZ DEFAULT NOW(),
    technician VARCHAR(100) NOT NULL,
    notes TEXT,
    passed BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_calibration_device ON calibration_records(device_id);