-- Add dashboard roles independently of the unreleased assessment-result tables.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assessor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'awarding_body_eqa';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'welfare_officer';