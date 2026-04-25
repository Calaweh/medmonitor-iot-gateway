-- =============================================================================
-- FINAL DATABASE SCHEMA — All tables from migrations, with all ALTERs applied
-- =============================================================================

-- 1. devices (20240422_initial, modified by 20260424_schema_upgrade)
CREATE TABLE IF NOT EXISTS devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT,
    -- location removed; replaced by site/department/room
    site        VARCHAR(100),
    department  VARCHAR(100),
    room        VARCHAR(50),
    labels      TEXT[] DEFAULT '{}',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. sensor_readings (20240422_initial, no later changes)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    payload     JSONB        NOT NULL
);

-- 3. alerts (20240422_initial, no later changes)
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

-- 4. users (20260423_clinical, modified by 20260425_add_2fa)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- 2FA columns added in 20260425000000_add_2fa
    totp_secret VARCHAR(255),
    is_totp_enabled BOOLEAN DEFAULT FALSE
);

-- 5. patients (20260423_clinical)
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

-- 6. bed_assignments (20260423_clinical)
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

-- 7. patient_thresholds (20260423_clinical)
CREATE TABLE IF NOT EXISTS patient_thresholds (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_sign VARCHAR(50) NOT NULL,
    min_value DECIMAL,
    max_value DECIMAL,
    set_by VARCHAR(100),
    set_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. audit_log (20260423_clinical, altered by 20260424_audit_hash)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    detail JSONB,
    ip_address INET,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    -- hash chaining columns added in 20260424000000_audit_hash
    previous_hash VARCHAR(64),
    hash VARCHAR(64)
);

-- 9. ward_assignments (20260423_clinical) – deprecated but never dropped
CREATE TABLE IF NOT EXISTS ward_assignments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    location    VARCHAR(100),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id)
);

-- 10. role_permissions (20260423_clinical)
CREATE TABLE IF NOT EXISTS role_permissions (
    id          BIGSERIAL PRIMARY KEY,
    role        VARCHAR(20),
    resource    VARCHAR(50),
    can_read    BOOLEAN DEFAULT FALSE,
    can_write   BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE
);

-- 11. access_policies (20260424_schema_upgrade) – successor to ward_assignments
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

-- 12. calibration_records (20260426_calibration)
CREATE TABLE IF NOT EXISTS calibration_records (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    calibrated_at TIMESTAMPTZ DEFAULT NOW(),
    technician VARCHAR(100) NOT NULL,
    notes TEXT,
    passed BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================================
-- INDEXES (from all migrations)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_payload ON sensor_readings USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time ON sensor_readings (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash ON audit_log (hash);
CREATE INDEX IF NOT EXISTS idx_device_hierarchy ON devices(site, department, room);
CREATE INDEX IF NOT EXISTS idx_device_labels ON devices USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_calibration_device ON calibration_records(device_id);

-- =============================================================================
-- SEED DATA (from migrations)
-- =============================================================================
-- Default devices (20240422)
INSERT INTO devices (device_code, description, site, department, room) VALUES
    ('ICU-BED-01', 'Patient Monitor — ICU Bed 1', 'General Hospital', 'ICU', 'Room 412'),
    ('ICU-BED-02', 'Patient Monitor — ICU Bed 2', 'General Hospital', 'ICU', 'Room 412'),
    ('ICU-BED-03', 'Patient Monitor — ICU Bed 3', 'General Hospital', 'ICU', 'Room 412')
ON CONFLICT (device_code) DO NOTHING;

-- Default admin user (20260423) – password 'Admin123!' (BCrypt hash)
INSERT INTO users (email, password_hash, role, full_name)
VALUES ('admin@medmonitor.local',
        '$2a$11$wK9gQ5YkF1V8C7D/O1H6I.D5a3C1H0F0B0A0C0D0E0F0G0H0I0J0K',
        'admin',
        'System Admin')
ON CONFLICT (email) DO NOTHING;

-- *Updated to 20260426000000_calibration.sql