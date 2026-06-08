-- ==========================================
-- Supabase SQL Editor Script: Enable RLS and Configure Access Policies
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qwspbnqtkxxwehhvjpmg/sql/new
-- ==========================================

-- 1. PHONE_NUMBERS TABLE RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can view their own clinic's phone numbers" ON public.phone_numbers
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own clinic's phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can update their own clinic's phone numbers" ON public.phone_numbers
    FOR UPDATE
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );


-- 2. TRANSACTIONS TABLE RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's transactions" ON public.transactions;
CREATE POLICY "Users can view their own clinic's transactions" ON public.transactions
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );


-- 3. LEADS TABLE RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's leads" ON public.leads;
CREATE POLICY "Users can view their own clinic's leads" ON public.leads
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update/manage their own clinic's leads" ON public.leads;
CREATE POLICY "Users can update/manage their own clinic's leads" ON public.leads
    FOR ALL
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );


-- 4. CLINIC_PHONE_NUMBERS TABLE RLS (Used by backend provisioning)
ALTER TABLE public.clinic_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clinic's phone connection details" ON public.clinic_phone_numbers;
CREATE POLICY "Users can view their own clinic's phone connection details" ON public.clinic_phone_numbers
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE user_id = auth.uid()
        )
    );
