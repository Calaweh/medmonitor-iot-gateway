-- ============================================================
-- V2 Clinical Schema: Patients, Wards, RBAC & Auditing
-- ============================================================

-- ─── 1. Users (RBAC) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed a default Admin user (Password is 'Admin123!' - hashed with BCrypt)
INSERT INTO users (email, password_hash, role, full_name) 
VALUES ('admin@medmonitor.local', '$2a$11$wK9gQ5YkF1V8C7D/O1H6I.D5a3C1H0F0B0A0C0D0E0F0G0H0I0J0K', 'admin', 'System Admin')
ON CONFLICT (email) DO NOTHING;

-- ─── 2. Patients ────────────────────────────────────────────
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

-- ─── 3. Bed Assignments ─────────────────────────────────────
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

-- ─── 4. Patient Thresholds ──────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_thresholds (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_sign VARCHAR(50) NOT NULL,
    min_value DECIMAL,
    max_value DECIMAL,
    set_by VARCHAR(100),
    set_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Audit Log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    detail JSONB,
    ip_address INET,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);