
-- EDUCLOUD CORE SCHEMA

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM (
  'superadmin', 'centre_director', 'admissions_admin', 'lecturer',
  'programme_leader', 'iqa_officer', 'exams_officer', 'finance_officer',
  'marketing_officer', 'agent', 'student', 'university_partner', 'employer_partner'
);

CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'onboarding');
CREATE TYPE public.tenant_plan AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE public.application_stage AS ENUM (
  'lead', 'contacted', 'qualified', 'applied', 'under_review',
  'conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled', 'lost', 'deferred'
);
CREATE TYPE public.invoice_status AS ENUM ('paid', 'partial', 'overdue', 'pending', 'refunded');
CREATE TYPE public.invoice_type AS ENUM ('tuition', 'exam', 'deposit', 'commission');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE public.programme_status AS ENUM ('active', 'draft', 'archived');
CREATE TYPE public.awarding_body AS ENUM ('OTHM', 'QUALIFI', 'IAB');

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. TENANTS TABLE
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status public.tenant_status NOT NULL DEFAULT 'onboarding',
  plan public.tenant_plan NOT NULL DEFAULT 'starter',
  primary_color TEXT DEFAULT '#8B1538',
  accent_color TEXT DEFAULT '#D4A853',
  logo_url TEXT,
  brand_name TEXT,
  custom_domain TEXT,
  students_count INTEGER DEFAULT 0,
  monthly_revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. USER ROLES TABLE (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY DEFINER FUNCTION for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 7. PROGRAMMES TABLE
CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  awarding_body public.awarding_body NOT NULL,
  credits INTEGER DEFAULT 0,
  duration TEXT,
  modules_count INTEGER DEFAULT 0,
  status public.programme_status NOT NULL DEFAULT 'draft',
  enrolled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_programmes_updated_at
  BEFORE UPDATE ON public.programmes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. MODULES TABLE
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT,
  credits INTEGER DEFAULT 0,
  lecturer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.programme_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. APPLICATIONS TABLE
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  programme_name TEXT,
  level TEXT,
  stage public.application_stage NOT NULL DEFAULT 'lead',
  counsellor TEXT,
  source TEXT,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. INVOICES TABLE
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  type public.invoice_type NOT NULL DEFAULT 'tuition',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  instalments INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. ATTENDANCE TABLE
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  method TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 12. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- TENANTS
CREATE POLICY "Public can view active tenants"
  ON public.tenants FOR SELECT
  USING (status = 'active');

CREATE POLICY "Superadmins manage tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Tenant staff can view tenant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- USER ROLES
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Directors manage tenant roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'centre_director')
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- PROGRAMMES
CREATE POLICY "Tenant users can view programmes"
  ON public.programmes FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Directors manage programmes"
  ON public.programmes FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'centre_director') OR public.has_role(auth.uid(), 'programme_leader'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- MODULES
CREATE POLICY "Tenant users can view modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Directors manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'centre_director') OR public.has_role(auth.uid(), 'programme_leader'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- APPLICATIONS
CREATE POLICY "Tenant staff can view applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR agent_id = auth.uid()
    OR user_id = auth.uid()
  );

CREATE POLICY "Admissions staff manage applications"
  ON public.applications FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admissions_admin') OR public.has_role(auth.uid(), 'centre_director'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Students can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- INVOICES
CREATE POLICY "Tenant staff can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR student_id = auth.uid()
  );

CREATE POLICY "Finance staff manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'finance_officer') OR public.has_role(auth.uid(), 'centre_director'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- ATTENDANCE
CREATE POLICY "Tenant staff can view attendance"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR student_id = auth.uid()
  );

CREATE POLICY "Lecturers manage attendance"
  ON public.attendance_records FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'lecturer') OR public.has_role(auth.uid(), 'centre_director'))
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );
