-- ============================================================
-- ADT History (Admission, Discharge, Transfer)
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_transfers (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    from_device_id UUID REFERENCES devices(id), -- NULL if new admission
    to_device_id UUID REFERENCES devices(id),   -- NULL if discharge
    action_type VARCHAR(20) NOT NULL,           -- ADMIT | TRANSFER | DISCHARGE
    performed_by UUID NOT NULL REFERENCES users(id),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_adt_patient ON patient_transfers(patient_id);