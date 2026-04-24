--- CREATE FILE supabase/migrations/20260425000000_add_2fa.sql ---
-- ============================================================
-- Add 2FA / TOTP columns to users table
-- ============================================================

ALTER TABLE users
ADD COLUMN totp_secret VARCHAR(255),
ADD COLUMN is_totp_enabled BOOLEAN DEFAULT FALSE;