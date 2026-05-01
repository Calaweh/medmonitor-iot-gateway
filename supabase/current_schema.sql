-- =============================================================================
-- FINAL DATABASE SCHEMA (after all migrations up to 20260504000000)
-- Includes: devices + department RBAC, clinical tables, audit hash chain,
--           strict access control, audit immutability, and mutual TLS support
-- =============================================================================

-- ============================================================
-- 1. CLEANUP: Drop deprecated tables (old RBAC, ward_assignments, access_policies)
-- ============================================================
DROP TABLE IF EXISTS ward_assignments CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;      -- old version
DROP TABLE IF EXISTS access_policies CASCADE;       -- replaced by dynamic RBAC

-- ============================================================
-- 2. CORE INFRASTRUCTURE: Departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    site        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. DEVICES (added department_id, kept legacy hierarchy for compatibility)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code   VARCHAR(50)  NOT NULL UNIQUE,
    description   TEXT,
    site          VARCHAR(100),                     -- legacy, kept for reports
    department    VARCHAR(100),                     -- legacy, kept for reports
    room          VARCHAR(50),                      -- legacy
    labels        TEXT[] DEFAULT '{}',
    api_key_hash  VARCHAR(255),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,   -- new RBAC link
    certificate_thumbprint VARCHAR(64)
);

-- ============================================================
-- 4. SENSOR READINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL    PRIMARY KEY,
    device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    payload     JSONB        NOT NULL
);

-- ============================================================
-- 5. ALERTS
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
-- 6. USERS (with 2FA and RBAC columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin')),
    full_name       VARCHAR(100) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    totp_secret     VARCHAR(255),
    is_totp_enabled BOOLEAN DEFAULT FALSE,
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    token_version   INT DEFAULT 1
);

-- ============================================================
-- 7. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn           VARCHAR(20) UNIQUE NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender        VARCHAR(20),
    blood_type    VARCHAR(5),
    allergies     TEXT[],
    consent       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. BED ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS bed_assignments (
    id                  BIGSERIAL PRIMARY KEY,
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    admitted_at         TIMESTAMPTZ DEFAULT NOW(),
    discharged_at       TIMESTAMPTZ,
    attending_physician VARCHAR(100),
    diagnosis           TEXT,
    admission_type      VARCHAR(50) CHECK (admission_type IN ('emergency', 'elective', 'transfer'))
);

-- ============================================================
-- 9. PATIENT THRESHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_thresholds (
    id          BIGSERIAL PRIMARY KEY,
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_sign  VARCHAR(50) NOT NULL,
    min_value   DECIMAL,
    max_value   DECIMAL,
    set_by      VARCHAR(100),
    set_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. AUDIT LOG (with hash chain)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     VARCHAR(100),
    detail        JSONB,
    ip_address    INET,
    occurred_at   TIMESTAMPTZ DEFAULT NOW(),
    previous_hash VARCHAR(64),
    hash          VARCHAR(64)
);

-- ============================================================
-- 11. CALIBRATION RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS calibration_records (
    id            BIGSERIAL PRIMARY KEY,
    device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    calibrated_at TIMESTAMPTZ DEFAULT NOW(),
    technician    VARCHAR(100) NOT NULL,
    notes         TEXT,
    passed        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 12. MEDICATION SCHEDULES (MAR)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage          VARCHAR(100) NOT NULL,
    route           VARCHAR(50),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'scheduled',
    notes           TEXT
);

-- ============================================================
-- 13. CLINICAL NOTES (SOAP)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    subjective  TEXT,
    objective   TEXT,
    assessment  TEXT,
    plan        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. PATIENT TRANSFERS (ADT History)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_transfers (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    from_device_id  UUID REFERENCES devices(id),
    to_device_id    UUID REFERENCES devices(id),
    action_type     VARCHAR(20) NOT NULL,
    performed_by    UUID NOT NULL REFERENCES users(id),
    occurred_at     TIMESTAMPTZ DEFAULT NOW(),
    notes           TEXT
);

-- ============================================================
-- 15. DYNAMIC RBAC TABLES
-- ============================================================

-- Permissions catalogue
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(resource, action)
);

-- Roles (bundles of permissions)
CREATE TABLE IF NOT EXISTS roles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) UNIQUE NOT NULL,
    description    TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Role-Permission junction
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Teams / Groups (scoped to department)
CREATE TABLE IF NOT EXISTS groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    description   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Group-Role association
CREATE TABLE IF NOT EXISTS group_roles (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role_id  UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_id)
);

-- User-Group membership
CREATE TABLE IF NOT EXISTS user_groups (
    user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Direct user-role overrides
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- 16. INDEXES (performance & compliance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sensor_readings_payload   ON sensor_readings USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time      ON sensor_readings (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash            ON audit_log (hash);
CREATE INDEX IF NOT EXISTS idx_device_hierarchy          ON devices (site, department, room);
CREATE INDEX IF NOT EXISTS idx_device_labels             ON devices USING GIN (labels);
CREATE INDEX IF NOT EXISTS idx_devices_thumbprint        ON devices (certificate_thumbprint);
CREATE INDEX IF NOT EXISTS idx_calibration_device        ON calibration_records (device_id);
CREATE INDEX IF NOT EXISTS idx_meds_patient              ON medication_schedules (patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient             ON clinical_notes (patient_id);
CREATE INDEX IF NOT EXISTS idx_adt_patient               ON patient_transfers (patient_id);
CREATE INDEX IF NOT EXISTS idx_devices_department        ON devices (department_id);
CREATE INDEX IF NOT EXISTS idx_users_department          ON users (department_id);

-- ============================================================
-- 17. ROW LEVEL SECURITY (RLS) – Department-based access
-- ============================================================

-- Enable RLS
ALTER TABLE devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices          FORCE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings  FORCE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           FORCE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments  FORCE ROW LEVEL SECURITY;
ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients         FORCE ROW LEVEL SECURITY;

-- Helper function (updated for department ID)
CREATE OR REPLACE FUNCTION has_device_access(p_device_dept_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_user_dept UUID;
BEGIN
    v_user_role := current_setting('app.user_role', true);
    IF v_user_role IN ('admin', 'system') THEN
        RETURN TRUE;
    END IF;
    v_user_dept := NULLIF(current_setting('app.user_dept_id', true), '')::UUID;
    RETURN (v_user_dept = p_device_dept_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop old policies if they exist (in case of upgrade)
DROP POLICY IF EXISTS device_isolation ON devices;
DROP POLICY IF EXISTS reading_isolation ON sensor_readings;
DROP POLICY IF EXISTS alert_isolation ON alerts;
DROP POLICY IF EXISTS bed_isolation ON bed_assignments;
DROP POLICY IF EXISTS patient_isolation ON patients;

-- Create new policies based on department
CREATE POLICY device_policy ON devices
    FOR ALL USING (has_device_access(department_id));

CREATE POLICY reading_policy ON sensor_readings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id AND has_device_access(d.department_id)
    ));

CREATE POLICY alert_policy ON alerts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id AND has_device_access(d.department_id)
    ));

CREATE POLICY bed_policy ON bed_assignments
    FOR ALL USING (EXISTS (
        SELECT 1 FROM devices d
        WHERE d.id = device_id AND has_device_access(d.department_id)
    ));

CREATE POLICY patient_policy ON patients
    FOR ALL USING (EXISTS (
        SELECT 1 FROM bed_assignments ba
        JOIN devices d ON d.id = ba.device_id
        WHERE ba.patient_id = patients.id
          AND ba.discharged_at IS NULL
          AND has_device_access(d.department_id)
    ));

-- ============================================================
-- 18. SEED DATA (minimum required for operation)
-- ============================================================

-- Default department
INSERT INTO departments (name, site, description) VALUES
    ('ICU', 'General Hospital', 'Intensive Care Unit')
ON CONFLICT (name) DO NOTHING;

-- Assign department to existing devices (simple migration)
UPDATE devices SET department_id = (SELECT id FROM departments WHERE name = 'ICU')
WHERE department = 'ICU' AND department_id IS NULL;

-- Permissions (as defined in dynamic_rbac.sql)
INSERT INTO permissions (resource, action, description) VALUES
    ('alerts',   'view',      'View real-time telemetry alerts'),
    ('alerts',   'resolve',   'Resolve alerts in assigned ward'),
    ('patients', 'view',      'View patient medical records'),
    ('patients', 'admit',     'Admit/Discharge patients'),
    ('patients', 'threshold', 'Set clinical alert thresholds'),
    ('patients', 'export',    'Export PHI (PDPA Consent required)'),
    ('reports',  'download',  'Generate shift handover PDFs'),
    ('audit',    'view',      'View security audit logs'),
    ('users',    'manage',    'Manage user accounts'),
    ('rbac',     'manage',    'Manage roles and groups')
ON CONFLICT (resource, action) DO NOTHING;

-- System roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('Nurse',  'Clinical staff responsible for monitoring and alarm resolution', TRUE),
    ('Doctor', 'Medical officers with authority to set thresholds and admit patients', TRUE),
    ('Admin',  'System administrators and IT staff', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- Nurse: view/resolve alerts, view patients, download reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Nurse' AND (
    (p.resource = 'alerts' AND p.action IN ('view', 'resolve')) OR
    (p.resource = 'patients' AND p.action = 'view') OR
    (p.resource = 'reports' AND p.action = 'download')
)
ON CONFLICT DO NOTHING;

-- Doctor: all alerts/patients/reports permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Doctor' AND p.resource IN ('alerts', 'patients', 'reports')
ON CONFLICT DO NOTHING;

-- Default admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role, full_name, department_id)
VALUES ('admin@medmonitor.local',
        '$2a$11$wK9gQ5YkF1V8C7D/O1H6I.D5a3C1H0F0B0A0C0D0E0F0G0H0I0J0K',
        'admin',
        'System Admin',
        (SELECT id FROM departments WHERE name = 'ICU'))
ON CONFLICT (email) DO NOTHING;

-- Seed three example devices (with department_id)
INSERT INTO devices (device_code, description, site, department, room, api_key_hash, department_id) VALUES
    ('ICU-BED-01', 'Patient Monitor — ICU Bed 1', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU')),
    ('ICU-BED-02', 'Patient Monitor — ICU Bed 2', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU')),
    ('ICU-BED-03', 'Patient Monitor — ICU Bed 3', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU')),
    ('ICU-BED-04', 'Patient Monitor — ICU Bed 4', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU'))
ON CONFLICT (device_code) DO NOTHING;

-- ============================================================
-- 19. STRICT DATABASE ACCESS CONTROL (Least Privilege)
-- ============================================================

-- Create dedicated backend application role (if not exists)
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medmon_api') THEN
      CREATE ROLE medmon_api WITH LOGIN PASSWORD 'ReplaceWithStrongApiPassword123!';
   END IF;
END
$$;

-- Revoke default public access to the public schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- Grant schema usage to our dedicated role
GRANT USAGE ON SCHEMA public TO medmon_api;

-- Grant standard CRUD permissions to the API role for all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medmon_api;

-- Revoke destructive permissions on append‑only tables
REVOKE UPDATE, DELETE ON audit_log FROM medmon_api;
REVOKE UPDATE, DELETE ON sensor_readings FROM medmon_api;   -- Only RetentionService may delete

-- Grant sequence access for auto‑increment (BIGSERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medmon_api;

-- Ensure future tables automatically grant access to medmon_api
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medmon_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO medmon_api;

-- ============================================================
-- 20. AUDIT LOG IMMUTABILITY (Database‑Level Trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL: Audit log entries are immutable (HSA CLS-MD Level 2). UPDATE and DELETE operations are strictly forbidden at the database layer.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_append_only_audit ON audit_log;
CREATE TRIGGER enforce_append_only_audit
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

-- *Updated to 20260428182600_strict_db_access_control.sql