-- ====================================================================
-- Supabase SQL Editor Script: Tier 3 Master Schema Verification
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qwspbnqtkxxwehhvjpmg/sql/new
-- ====================================================================

-- 1. CLINICS TABLE COLUMN VERIFICATION
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS monthly_minutes_limit INT DEFAULT 500;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS monthly_minutes_used INT DEFAULT 0;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS monthly_sms_limit INT DEFAULT 500;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS monthly_sms_used INT DEFAULT 0;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS wallet_balance FLOAT DEFAULT 0;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS auto_recharge BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS public.clinics ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'clinic';

-- 2. PHONE_NUMBERS TABLE COLUMN VERIFICATION
ALTER TABLE IF EXISTS public.phone_numbers ADD COLUMN IF NOT EXISTS ai_answering BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.phone_numbers ADD COLUMN IF NOT EXISTS clinic_direct_line TEXT;

-- 3. APPOINTMENTS TABLE CREATION
CREATE TABLE IF NOT EXISTS public.appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_time ON public.appointments(clinic_id, date, time);

-- 4. SYSTEM_SETTINGS TABLE CREATION (For dynamic API keys)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    description  TEXT,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 5. NUMBER_LOCKS TABLE CREATION
CREATE TABLE IF NOT EXISTS public.number_locks (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number      TEXT NOT NULL UNIQUE,
    user_id     UUID NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. PROVISIONING_JOBS TABLE CREATION
CREATE TABLE IF NOT EXISTS public.provisioning_jobs (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id        UUID NOT NULL,
    number         TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    step           TEXT NOT NULL DEFAULT 'purchase',
    error_message  TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- 7. CLINIC_PHONE_NUMBERS TABLE CREATION
CREATE TABLE IF NOT EXISTS public.clinic_phone_numbers (
    clinic_id                   UUID PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
    phone_number                TEXT NOT NULL,
    provider                    TEXT NOT NULL,
    provider_number_sid         TEXT,
    livekit_inbound_trunk_id    TEXT,
    livekit_dispatch_rule_id    TEXT,
    livekit_outbound_trunk_id   TEXT,
    status                      TEXT NOT NULL DEFAULT 'active',
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);
