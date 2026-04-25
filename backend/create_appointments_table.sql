-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qwspbnqtkxxwehhvjpmg/sql/new

CREATE TABLE IF NOT EXISTS appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_name    TEXT NOT NULL,
    phone           TEXT NOT NULL,
    service         TEXT NOT NULL,
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'confirmed',
    source          TEXT DEFAULT 'voice_bot',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_time ON appointments(clinic_id, date, time);
