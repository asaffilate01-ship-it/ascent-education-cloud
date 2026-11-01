-- PHASE E-0: proposed role enum values for the UniPathway Supabase project ONLY.
-- Review/apply on an isolated UniPathway STAGING clone, commit this transaction
-- before using the new enum values in Phase E-1. Do not run on Dishbee.
-- No database change occurs when this source file is committed.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'office_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';
