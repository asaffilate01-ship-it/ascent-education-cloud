
-- Add parent_guardian role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent_guardian';
