
-- 1. Certificate verifications table for public lookup
CREATE TABLE public.certificate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text NOT NULL UNIQUE,
  student_name text NOT NULL,
  programme_title text NOT NULL,
  awarding_body text NOT NULL DEFAULT 'OTHM',
  level text NOT NULL,
  grade text,
  issue_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'valid',
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Public can verify certificates (read-only by certificate_number)
CREATE POLICY "Anyone can verify certificates" ON public.certificate_verifications
  FOR SELECT TO public USING (true);

-- Staff manage certificates
CREATE POLICY "Staff manage certificates" ON public.certificate_verifications
  FOR ALL TO authenticated USING (
    (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'exams_officer'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
    AND (tenant_id = get_user_tenant_id(auth.uid()))
  );

-- 2. Add entry_requirements JSONB column to programmes
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS entry_requirements jsonb DEFAULT '{}';

-- 3. Accreditation bodies table
CREATE TABLE public.accreditation_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  country text DEFAULT 'UK',
  is_active boolean NOT NULL DEFAULT true,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accreditation_bodies ENABLE ROW LEVEL SECURITY;

-- Public can view active accreditation bodies
CREATE POLICY "Anyone can view accreditation bodies" ON public.accreditation_bodies
  FOR SELECT TO public USING (is_active = true);

-- Directors manage accreditation bodies
CREATE POLICY "Directors manage accreditation bodies" ON public.accreditation_bodies
  FOR ALL TO authenticated USING (
    (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
    AND (tenant_id = get_user_tenant_id(auth.uid()))
  );

-- 4. Add progression_pathway JSONB to programmes for career pathway data
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS progression_pathway jsonb DEFAULT '[]';
