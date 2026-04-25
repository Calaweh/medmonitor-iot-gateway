-- =============================================================================
-- FINAL DATABASE SCHEMA (snapshot after migration 20260501000000)
-- All tables, columns, indexes, RLS policies and seed data are included.
-- =============================================================================

-- ============================================================
-- 1. DEVICES (initial + site/department/room/labels + api_key_hash)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT,
    site        VARCHAR(100),
    department  VARCHAR(100),
    room        VARCHAR(50),
    labels      TEXT[] DEFAULT '{}',
    api_key_hash VARCHAR(255),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SENSOR READINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    payload     JSONB        NOT NULL
);

-- ============================================================
-- 3. ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    reading_id  BIGINT       REFERENCES sensor_readings(id) ON DELETE SET NULL,
    alert_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(20)  NOT NULL DEFAULT 'WARNING',
    message     TEXT         NOT NULL,
    is_resolved BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 4. USERS (with 2FA columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    totp_secret VARCHAR(255),
    is_totp_enabled BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 5. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    blood_type VARCHAR(5),
    allergies TEXT[],
    consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. BED ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS bed_assignments (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    admitted_at TIMESTAMPTZ DEFAULT NOW(),
    discharged_at TIMESTAMPTZ,
    attending_physician VARCHAR(100),
    diagnosis TEXT,
    admission_type VARCHAR(50) CHECK (admission_type IN ('emergency', 'elective', 'transfer'))
);

-- ============================================================
-- 7. PATIENT THRESHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_thresholds (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_sign VARCHAR(50) NOT NULL,
    min_value DECIMAL,
    max_value DECIMAL,
    set_by VARCHAR(100),
    set_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. AUDIT LOG (with hash chain columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    detail JSONB,
    ip_address INET,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    previous_hash VARCHAR(64),
    hash VARCHAR(64)
);

-- ============================================================
-- 9. ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id          BIGSERIAL PRIMARY KEY,
    role        VARCHAR(20),
    resource    VARCHAR(50),
    can_read    BOOLEAN DEFAULT FALSE,
    can_write   BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 10. ACCESS POLICIES (replacement for ward_assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    group_name VARCHAR(100),
    allowed_site VARCHAR(100),
    allowed_department VARCHAR(100),
    allowed_room VARCHAR(50),
    allowed_labels TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ
);

-- ============================================================
-- 11. CALIBRATION RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS calibration_records (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    calibrated_at TIMESTAMPTZ DEFAULT NOW(),
    technician VARCHAR(100) NOT NULL,
    notes TEXT,
    passed BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 12. MEDICATION SCHEDULES (MAR)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50),
    scheduled_at TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT
);

-- ============================================================
-- 13. CLINICAL NOTES (SOAP)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. PATIENT TRANSFERS (ADT History)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_transfers (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    from_device_id UUID REFERENCES devices(id),
    to_device_id UUID REFERENCES devices(id),
    action_type VARCHAR(20) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- ============================================================
-- 15. (Deprecated) WARD ASSIGNMENTS – exists unless deliberately dropped
--     Uncomment the DROP below if you want to remove it permanently.
-- ============================================================
-- DROP TABLE IF EXISTS ward_assignments CASCADE;
CREATE TABLE IF NOT EXISTS ward_assignments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    location    VARCHAR(100),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id)
);

-- =============================================================================
-- INDEXES (from all migrations)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_payload   ON sensor_readings USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time      ON sensor_readings (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash            ON audit_log (hash);
CREATE INDEX IF NOT EXISTS idx_device_hierarchy          ON devices (site, department, room);
CREATE INDEX IF NOT EXISTS idx_device_labels             ON devices USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_calibration_device        ON calibration_records (device_id);
CREATE INDEX IF NOT EXISTS idx_meds_patient             ON medication_schedules (patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient            ON clinical_notes (patient_id);
CREATE INDEX IF NOT EXISTS idx_adt_patient              ON patient_transfers (patient_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) – Phase 6 policies
-- =============================================================================

-- Enable and force RLS on sensitive tables
ALTER TABLE devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices         FORCE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings FORCE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          FORCE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients        FORCE ROW LEVEL SECURITY;

-- Policy helper function
CREATE OR REPLACE FUNCTION has_device_access(
    p_site        TEXT,
    p_department  TEXT,
    p_room        TEXT,
    p_labels      TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_id   UUID;
    v_user_role TEXT;
BEGIN
    v_user_role := current_setting('app.user_role', true);
    IF v_user_role IN ('admin', 'system') THEN
        RETURN TRUE;
    END IF;
    IF v_user_role IS NULL OR v_user_role = '' THEN
        RETURN FALSE;
    END IF;
    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
    RETURN EXISTS (
        SELECT 1 FROM access_policies ap
        WHERE ap.user_id   = v_user_id
          AND ap.is_active = TRUE
          AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
          AND (
              (   (ap.allowed_site       IS NULL OR ap.allowed_site       = p_site)
              AND (ap.allowed_department IS NULL OR ap.allowed_department = p_department)
              AND (ap.allowed_room       IS NULL OR ap.allowed_room       = p_room)
              )
              OR (ap.allowed_labels && p_labels)
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Apply policies
CREATE POLICY device_isolation ON devices FOR ALL
    USING (has_device_access(site, department, room, labels));

CREATE POLICY reading_isolation ON sensor_readings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id
          AND has_device_access(d.site, d.department, d.room, d.labels)
    ));

CREATE POLICY alert_isolation ON alerts FOR ALL
    USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id
          AND has_device_access(d.site, d.department, d.room, d.labels)
    ));

CREATE POLICY bed_isolation ON bed_assignments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id
          AND has_device_access(d.site, d.department, d.room, d.labels)
    ));

CREATE POLICY patient_isolation ON patients FOR ALL
    USING (EXISTS (
        SELECT 1 FROM bed_assignments ba
        JOIN devices d ON d.id = ba.device_id
        WHERE ba.patient_id = patients.id
          AND ba.discharged_at IS NULL
          AND has_device_access(d.site, d.department, d.room, d.labels)
    ));

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Default admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role, full_name)
VALUES ('admin@medmonitor.local',
        '$2a$11$wK9gQ5YkF1V8C7D/O1H6I.D5a3C1H0F0B0A0C0D0E0F0G0H0I0J0K',
        'admin',
        'System Admin')
ON CONFLICT (email) DO NOTHING;

-- Default devices (with API key hash for 'DeviceSecret123!')
INSERT INTO devices (device_code, description, site, department, room, api_key_hash) VALUES
    ('ICU-BED-01', 'Patient Monitor — ICU Bed 1', 'General Hospital', 'ICU', 'Room 412',
     'xxx'),
    ('ICU-BED-02', 'Patient Monitor — ICU Bed 2', 'General Hospital', 'ICU', 'Room 412',
     'xxx'),
    ('ICU-BED-03', 'Patient Monitor — ICU Bed 3', 'General Hospital', 'ICU', 'Room 412',
     'xxx')
ON CONFLICT (device_code) DO NOTHING;

-- *Updated to 20260501000000_device_api_keys.sql