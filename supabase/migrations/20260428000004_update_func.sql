CREATE OR REPLACE FUNCTION has_device_access(
    p_device_dept_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_id   UUID;
    v_user_role TEXT;
    v_user_dept UUID;
BEGIN
    v_user_role := current_setting('app.user_role', true);
    
    -- Admins and System bypass all checks
    IF v_user_role IN ('admin', 'system') THEN
        RETURN TRUE;
    END IF;

    -- Get current user's department from the session variable we set in Middleware
    v_user_dept := NULLIF(current_setting('app.user_dept_id', true), '')::UUID;

    -- Return TRUE only if the device belongs to the user's assigned department
    RETURN (v_user_dept = p_device_dept_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;