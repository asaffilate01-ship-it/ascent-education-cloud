
-- ============================================================
-- PHASE 28: RESTORE TRIGGERS + CREATE STUDENT ENROLMENTS TABLE
-- ============================================================

-- 1. Restore all critical triggers
-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent tenant_id tampering
DROP TRIGGER IF EXISTS prevent_tenant_id_change_profiles ON public.profiles;
CREATE TRIGGER prevent_tenant_id_change_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_id_change_applications ON public.applications;
CREATE TRIGGER prevent_tenant_id_change_applications
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_id_change();

-- Sanitize student submissions
DROP TRIGGER IF EXISTS sanitize_student_submission ON public.submissions;
CREATE TRIGGER sanitize_student_submission
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_student_submission();

-- updated_at auto-timestamps
DROP TRIGGER IF EXISTS set_updated_at_applications ON public.applications;
CREATE TRIGGER set_updated_at_applications BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_programmes ON public.programmes;
CREATE TRIGGER set_updated_at_programmes BEFORE UPDATE ON public.programmes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_modules ON public.modules;
CREATE TRIGGER set_updated_at_modules BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_invoices ON public.invoices;
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_submissions ON public.submissions;
CREATE TRIGGER set_updated_at_submissions BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_assignments ON public.assignments;
CREATE TRIGGER set_updated_at_assignments BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_conversations ON public.conversations;
CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_tenants ON public.tenants;
CREATE TRIGGER set_updated_at_tenants BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create student_enrolments table for proper student-programme tracking
CREATE TABLE IF NOT EXISTS public.student_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, programme_id)
);

ALTER TABLE public.student_enrolments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own enrolments" ON public.student_enrolments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Staff view tenant enrolments" ON public.student_enrolments
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'centre_director') OR
    has_role(auth.uid(), 'admissions_admin') OR
    has_role(auth.uid(), 'lecturer') OR
    has_role(auth.uid(), 'programme_leader')
  ));

CREATE POLICY "Admissions staff manage enrolments" ON public.student_enrolments
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admissions_admin') OR has_role(auth.uid(), 'centre_director'))
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

DROP TRIGGER IF EXISTS set_updated_at_student_enrolments ON public.student_enrolments;
CREATE TRIGGER set_updated_at_student_enrolments BEFORE UPDATE ON public.student_enrolments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Auto-create enrolment when application moves to enrolled
CREATE OR REPLACE FUNCTION public.auto_enrol_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.stage = 'enrolled' AND (OLD.stage IS NULL OR OLD.stage != 'enrolled') THEN
    INSERT INTO public.student_enrolments (student_id, programme_id, tenant_id, application_id)
    VALUES (NEW.user_id, NEW.programme_id, NEW.tenant_id, NEW.id)
    ON CONFLICT (student_id, programme_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_enrol_on_stage_change ON public.applications;
CREATE TRIGGER auto_enrol_on_stage_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.auto_enrol_student();

-- Ensure realtime is active for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_enrolments;
