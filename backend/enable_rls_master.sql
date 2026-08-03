-- ====================================================================
-- Supabase SQL Editor Script: Enable Master RLS & Multi-Tenant Isolation
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qwspbnqtkxxwehhvjpmg/sql/new
-- ====================================================================

-- 1. CLINICS TABLE RLS
ALTER TABLE IF EXISTS public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic" ON public.clinics;
CREATE POLICY "Users can view their own clinic" ON public.clinics
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own clinic" ON public.clinics;
CREATE POLICY "Users can update their own clinic" ON public.clinics
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own clinic" ON public.clinics;
CREATE POLICY "Users can insert their own clinic" ON public.clinics
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());


-- 2. LEADS TABLE RLS
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's leads" ON public.leads;
CREATE POLICY "Users can view their own clinic's leads" ON public.leads
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage their own clinic's leads" ON public.leads;
CREATE POLICY "Users can manage their own clinic's leads" ON public.leads
    FOR ALL TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 3. PHONE_NUMBERS TABLE RLS
ALTER TABLE IF EXISTS public.phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can view their own clinic's phone numbers" ON public.phone_numbers
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own clinic's phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can update their own clinic's phone numbers" ON public.phone_numbers
    FOR UPDATE TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 4. CLINIC_PHONE_NUMBERS TABLE RLS
ALTER TABLE IF EXISTS public.clinic_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view connection details for their clinic" ON public.clinic_phone_numbers;
CREATE POLICY "Users can view connection details for their clinic" ON public.clinic_phone_numbers
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 5. TRANSACTIONS TABLE RLS
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their clinic's transactions" ON public.transactions;
CREATE POLICY "Users can view their clinic's transactions" ON public.transactions
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 6. AGENT_SETTINGS TABLE RLS
ALTER TABLE IF EXISTS public.agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view agent settings for their clinic" ON public.agent_settings;
CREATE POLICY "Users can view agent settings for their clinic" ON public.agent_settings
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert agent settings for their clinic" ON public.agent_settings;
CREATE POLICY "Users can insert agent settings for their clinic" ON public.agent_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update agent settings for their clinic" ON public.agent_settings;
CREATE POLICY "Users can update agent settings for their clinic" ON public.agent_settings
    FOR UPDATE TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage agent settings for their clinic" ON public.agent_settings;
CREATE POLICY "Users can manage agent settings for their clinic" ON public.agent_settings
    FOR ALL TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 7. APPOINTMENTS TABLE RLS
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view appointments for their clinic" ON public.appointments;
CREATE POLICY "Users can view appointments for their clinic" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage appointments for their clinic" ON public.appointments;
CREATE POLICY "Users can manage appointments for their clinic" ON public.appointments
    FOR ALL TO authenticated
    USING (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 8. NUMBER_LOCKS TABLE RLS
ALTER TABLE IF EXISTS public.number_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own number locks" ON public.number_locks;
CREATE POLICY "Users can view their own number locks" ON public.number_locks
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR user_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 9. PROVISIONING_JOBS TABLE RLS
ALTER TABLE IF EXISTS public.provisioning_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own provisioning jobs" ON public.provisioning_jobs;
CREATE POLICY "Users can view their own provisioning jobs" ON public.provisioning_jobs
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR user_id IN (SELECT id FROM public.clinics WHERE user_id = auth.uid())
    );


-- 10. SYSTEM_SETTINGS TABLE RLS (Restricted to service_role)
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

-- Note: No SELECT/ALL policies for 'authenticated' means normal users cannot read system API keys.
-- Service role key bypasses RLS and can freely read/write system_settings.
