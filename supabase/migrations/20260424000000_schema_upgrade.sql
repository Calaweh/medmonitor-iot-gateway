-- 1. Devices: Add explicit hierarchy + tags
ALTER TABLE devices 
  DROP COLUMN location,
  ADD COLUMN site VARCHAR(100),       -- e.g., 'General Hospital'
  ADD COLUMN department VARCHAR(100), -- e.g., 'ICU'
  ADD COLUMN room VARCHAR(50),        -- e.g., 'Room 412'
  ADD COLUMN labels TEXT[] DEFAULT '{}'; -- e.g., ['code-blue-zone', 'vip-suite']

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_device_hierarchy ON devices(site, department, room);
CREATE INDEX IF NOT EXISTS idx_device_labels ON devices USING GIN(labels);

-- 2. Replace 'ward_assignments' with 'access_policies'
CREATE TABLE IF NOT EXISTS access_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    group_name VARCHAR(100),          -- e.g., 'ICU Night Shift', 'Emergency Response'
    
    -- Rules (NULL means "Any/All")
    allowed_site VARCHAR(100),        
    allowed_department VARCHAR(100),
    allowed_room VARCHAR(50),
    allowed_labels TEXT[],            -- If set, user can see devices with ANY of these labels
    
    -- The Lock/Unlock toggle
    is_active BOOLEAN DEFAULT TRUE,   -- Toggle FALSE to instantly lock access
    expires_at TIMESTAMPTZ            -- For temporary "Break Glass" emergency access
);