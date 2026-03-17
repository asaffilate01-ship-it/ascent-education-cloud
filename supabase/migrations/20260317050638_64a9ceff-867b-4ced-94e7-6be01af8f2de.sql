
-- Add course_number to programmes (unique per tenant)
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS course_number text;

-- Add course_number to modules (unique per programme)  
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS module_number text;

-- Create unique index for course numbers within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_programmes_course_number_tenant 
  ON public.programmes (tenant_id, course_number) 
  WHERE course_number IS NOT NULL;

-- Create unique index for module numbers within a programme
CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_module_number_programme 
  ON public.modules (programme_id, module_number) 
  WHERE module_number IS NOT NULL;

-- Also add module_id to classroom_sessions to tie sessions to specific modules
-- (column already exists, just ensure it's there)
