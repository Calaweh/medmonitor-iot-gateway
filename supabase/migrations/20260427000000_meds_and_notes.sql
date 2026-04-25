-- ============================================================
-- Phase 5: Clinical Completeness (MAR & SOAP Notes)
-- ============================================================

-- 1. Medication Schedules (MAR)
CREATE TABLE IF NOT EXISTS medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50), -- IV, Oral, etc.
    scheduled_at TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, administered, overdue, cancelled
    notes TEXT
);

-- 2. Clinical Notes (SOAP Format)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    subjective TEXT, -- What the patient says
    objective TEXT,  -- Vital signs / physical exam
    assessment TEXT, -- Clinician's diagnosis/interpretation
    plan TEXT,       -- Treatment steps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meds_patient ON medication_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);