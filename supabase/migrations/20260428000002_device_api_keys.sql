-- ============================================================
-- Device Security: Unique API Keys per Device
-- ============================================================

ALTER TABLE devices ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255);

-- Update the three seeded devices with the hash for ''
UPDATE devices SET api_key_hash = ''
WHERE device_code IN ('ICU-BED-01', 'ICU-BED-02', 'ICU-BED-03')