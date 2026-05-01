-- ============================================================
-- 1. CLEANUP: Remove Deprecated/Unused Tables
-- ============================================================
DROP TABLE IF EXISTS ward_assignments CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE; -- Recreating this with new schema

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
-- 3. PERMISSION CATALOGUE (The "Capabilities")
-- ============================================================
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(50) NOT NULL, -- 'alerts', 'patients', 'reports'
    action      VARCHAR(50) NOT NULL, -- 'view', 'resolve', 'admit', 'export'
    description TEXT,
    UNIQUE (resource, action)
);

-- ============================================================
-- 4. ROLES (Bundles of Permissions)
-- ============================================================
CREATE TABLE roles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) UNIQUE NOT NULL,
    description    TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- Protection for clinical safety
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 5. GROUPS (Teams Scoped to Departments)
-- ============================================================
CREATE TABLE groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    description   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_roles (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role_id  UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_id)
);

-- ============================================================
-- 6. USER MAPPINGS & SCHEMA UPDATES
-- ============================================================
-- Add department_id and token_version to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

-- Table for direct user-group membership
CREATE TABLE user_groups (
    user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Table for direct role overrides (edge cases)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- 7. SEED DATA (Clinical Safety Floor)
-- ============================================================

-- Seed Permissions
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
    ('rbac',     'manage',    'Manage roles and groups');

-- Create System Roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('Nurse', 'Clinical staff responsible for monitoring and alarm resolution', TRUE),
    ('Doctor', 'Medical officers with authority to set thresholds and admit patients', TRUE),
    ('Admin', 'System administrators and IT staff', TRUE);

-- Assign Permissions to Roles
-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='Admin'), id FROM permissions;

-- Nurse gets clinical view and resolve
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='Nurse'), id FROM permissions 
WHERE (resource='alerts' AND action IN ('view', 'resolve')) 
   OR (resource='patients' AND action='view')
   OR (resource='reports' AND action='download');

-- Doctor gets clinical + management
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name='Doctor'), id FROM permissions 
WHERE resource IN ('alerts', 'patients', 'reports');