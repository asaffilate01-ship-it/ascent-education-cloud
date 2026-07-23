ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS destination text NOT NULL DEFAULT 'pakistan',
  ADD COLUMN IF NOT EXISTS study_level text,
  ADD COLUMN IF NOT EXISTS intake text,
  ADD COLUMN IF NOT EXISTS document_checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS applications_destination_idx ON public.applications (destination);