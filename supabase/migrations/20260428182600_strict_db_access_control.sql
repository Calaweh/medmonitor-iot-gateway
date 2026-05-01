-- =================================================================================
-- Migration: Strict Database Access Control & Immutability
-- Description: Creates a least-privilege backend role, revokes public schema access,
--              and strictly enforces an append-only architecture for the audit log.
-- =================================================================================

-- 1. Create a dedicated backend application role
-- (Note: In production, change this password immediately via Supabase dashboard)
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medmon_api') THEN
      CREATE ROLE medmon_api WITH LOGIN PASSWORD 'ReplaceWithStrongApiPassword123!';
   END IF;
END
$$;

-- 2. Revoke default public access to the public schema to prevent unauthorized local connections
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- 3. Grant schema usage to our new dedicated role
GRANT USAGE ON SCHEMA public TO medmon_api;

-- 4. Grant standard CRUD permissions to the API role for all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medmon_api;

-- 5. Revoke destructive permissions on append-only tables
REVOKE UPDATE, DELETE ON audit_log FROM medmon_api;
REVOKE UPDATE, DELETE ON sensor_readings FROM medmon_api; -- Only RetentionService (background job) should delete these

-- 6. Grant sequence access so ID auto-increment (BIGSERIAL) works for INSERTs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medmon_api;

-- 7. Ensure future tables automatically grant access to medmon_api
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medmon_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO medmon_api;

-- =================================================================================
-- 8. HARDEN AUDIT LOG: Database-Level Immutability Trigger
-- Even if someone connects as the 'postgres' superuser, they cannot alter logs 
-- without explicitly dropping this trigger first (which leaves a massive footprint).
-- =================================================================================

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