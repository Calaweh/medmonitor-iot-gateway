-- ============================================================
-- Medical Device Monitoring System — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Devices ────────────────────────────────────────────────
-- Represents a physical (or simulated) medical device unit.
CREATE TABLE IF NOT EXISTS devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. "ICU-BED-01"
    description TEXT,
    location    VARCHAR(100),                    -- e.g. "Ward 3 - ICU"
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Sensor Readings ────────────────────────────────────────
-- One row per reading packet from a device.
-- 'payload' stores the raw sensor values as JSONB so the schema
-- stays flexible as new sensors are added without migrations.
--
-- Example payload:
-- {
--   "heart_rate":   78,
--   "spo2":         98,
--   "systolic_bp":  120,
--   "diastolic_bp":  80,
--   "temperature":  36.7,
--   "respiration":  16
-- }
CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    payload     JSONB        NOT NULL
);

-- ─── Indexes ────────────────────────────────────────────────
-- GIN index: fast querying inside JSONB keys (e.g. WHERE payload->>'heart_rate' > '100')
CREATE INDEX IF NOT EXISTS idx_sensor_readings_payload
    ON sensor_readings USING GIN (payload);

-- B-Tree index: fast time-range queries (e.g. WHERE recorded_at > NOW() - INTERVAL '1 hour')
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time
    ON sensor_readings (device_id, recorded_at DESC);

-- ─── Alerts ─────────────────────────────────────────────────
-- Triggered when a reading exceeds a clinical threshold.
CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    reading_id  BIGINT       REFERENCES sensor_readings(id) ON DELETE SET NULL,
    alert_type  VARCHAR(50)  NOT NULL,          -- e.g. "HIGH_HEART_RATE"
    severity    VARCHAR(20)  NOT NULL DEFAULT 'WARNING',  -- WARNING | CRITICAL
    message     TEXT         NOT NULL,
    is_resolved BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ─── Seed: Default Devices (for local dev) ──────────────────
INSERT INTO devices (device_code, description, location) VALUES
    ('ICU-BED-01', 'Patient Monitor — ICU Bed 1', 'Ward 3 - ICU'),
    ('ICU-BED-02', 'Patient Monitor — ICU Bed 2', 'Ward 3 - ICU'),
    ('ICU-BED-03', 'Patient Monitor — ICU Bed 3', 'Ward 3 - ICU')
ON CONFLICT (device_code) DO NOTHING;
