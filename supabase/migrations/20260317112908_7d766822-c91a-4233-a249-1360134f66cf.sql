
-- 1. SERVER-SIDE ROLE ASSIGNMENT: Move from client to trigger
-- This prevents privilege escalation by ensuring only student/agent roles are assigned on signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_type text;
  user_role app_role;
BEGIN
  account_type := NEW.raw_user_meta_data->>'account_type';
  
  IF account_type = 'agent' THEN
    user_role := 'agent';
  ELSE
    user_role := 'student';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid conflict, then create
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- 2. GDPR CONSENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own consent"
  ON public.consent_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own consent"
  ON public.consent_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous insert for cookie consent before login
CREATE POLICY "Anon insert consent"
  ON public.consent_records FOR INSERT
  TO anon
  WITH CHECK (true);

-- No update/delete - consent records are immutable audit trail
