-- 1. Number Locks Table to prevent race conditions during payment
CREATE TABLE IF NOT EXISTS public.number_locks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL, -- or clinic_id
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Provisioning Jobs Table to track the async telephony setup pipeline
CREATE TABLE IF NOT EXISTS public.provisioning_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- or clinic_id
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
    step TEXT NOT NULL DEFAULT 'purchase', -- 'purchase', 'sip_trunk', 'livekit_rule', 'db_assign'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add onboarding tracking to Clinics table
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'clinic';

-- 4. Enable RLS (Optional depending on your setup)
-- ALTER TABLE public.number_locks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.provisioning_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Create a pg_cron job to automatically delete expired locks every 5 minutes (requires pg_cron extension)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('0 * * * *', $$DELETE FROM public.number_locks WHERE expires_at < NOW();$$);
