-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qwspbnqtkxxwehhvjpmg/sql/new

-- Step 1: Add sms_provider column to clinics table
-- Values: 'telnyx' | 'twilio' | 'vobiz'
-- NULL = use global default from .env SMS_PROVIDER setting

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT NULL;

-- Step 2: Set your clinic ("My Family Care") to use VoBiz for SMS
UPDATE clinics
SET sms_provider = 'vobiz'
WHERE id = '138a09d3-33bd-47ae-a80c-2c5168b974a9';

-- Verify the update
SELECT id, name, assigned_number, sms_provider FROM clinics;



