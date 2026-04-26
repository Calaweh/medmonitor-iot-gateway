-- Sprint 5.2: Support for Mutual TLS Hardware Authentication
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS certificate_thumbprint VARCHAR(64);

-- Index for sub-millisecond hardware lookups
CREATE INDEX IF NOT EXISTS idx_devices_thumbprint ON devices (certificate_thumbprint);