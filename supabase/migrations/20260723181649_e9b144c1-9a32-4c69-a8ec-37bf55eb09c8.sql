ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS study_level text,
  ADD COLUMN IF NOT EXISTS intake text,
  ADD COLUMN IF NOT EXISTS document_checklist jsonb;

CREATE INDEX IF NOT EXISTS applications_destination_idx ON public.applications (destination);