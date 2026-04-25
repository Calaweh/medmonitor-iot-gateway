--- CREATE FILE supabase/migrations/20260430000000_rls_policies.sql ---
-- ============================================================
-- Phase 6: Migration to DB-Level Row Level Security (RLS)
-- ============================================================

-- 1. Enable and Force RLS on all sensitive tables
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

-- 2. Create the unified Access Policy evaluation function
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

    -- Admins and internal background jobs see everything
    IF v_user_role IN ('admin', 'system') THEN
        RETURN TRUE;
    END IF;

    -- If unauthenticated or no role passed, deny immediately
    IF v_user_role IS NULL OR v_user_role = '' THEN
        RETURN FALSE;
    END IF;

    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;

    -- Check access_policies table
    RETURN EXISTS (
        SELECT 1 FROM access_policies ap
        WHERE ap.user_id   = v_user_id
          AND ap.is_active = TRUE
          AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
          AND (
              -- Hierarchy: site → department → room
              (
                  (ap.allowed_site       IS NULL OR ap.allowed_site       = p_site)
              AND (ap.allowed_department IS NULL OR ap.allowed_department = p_department)
              AND (ap.allowed_room       IS NULL OR ap.allowed_room       = p_room)
              )
              OR
              -- Label-based access (cross-cutting, e.g. 'ISOLATION', 'ICU-CRITICAL')
              (ap.allowed_labels && p_labels)
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Apply policies
CREATE POLICY device_isolation ON devices FOR ALL
    USING (has_device_access(site, department, room, labels));

CREATE POLICY reading_isolation ON sensor_readings FOR ALL
    USING (EXISTS (SELECT 1 FROM devices d WHERE d.id = device_id AND has_device_access(d.site, d.department, d.room, d.labels)));

CREATE POLICY alert_isolation ON alerts FOR ALL
    USING (EXISTS (SELECT 1 FROM devices d WHERE d.id = device_id AND has_device_access(d.site, d.department, d.room, d.labels)));

CREATE POLICY bed_isolation ON bed_assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM devices d WHERE d.id = device_id AND has_device_access(d.site, d.department, d.room, d.labels)));

CREATE POLICY patient_isolation ON patients FOR ALL
    USING (EXISTS (
        SELECT 1 FROM bed_assignments ba
        JOIN devices d ON d.id = ba.device_id
        WHERE ba.patient_id  = patients.id AND ba.discharged_at IS NULL AND has_device_access(d.site, d.department, d.room, d.labels)
    ));