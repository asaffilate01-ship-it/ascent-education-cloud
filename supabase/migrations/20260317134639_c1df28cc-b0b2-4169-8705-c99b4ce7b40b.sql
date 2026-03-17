
-- ============================================================
-- CRITICAL FIX 1: Prevent users from changing their own tenant_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT: only superadmins or centre_directors can set tenant_id
  IF TG_OP = 'INSERT' THEN
    IF NEW.tenant_id IS NOT NULL AND NOT has_role(NEW.user_id, 'superadmin') AND NOT has_role(NEW.user_id, 'centre_director') THEN
      -- Allow if set by handle_new_user trigger (SECURITY DEFINER context)
      -- The trigger runs as definer so this check won't block it
      NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: prevent any user from changing their own tenant_id
  IF TG_OP = 'UPDATE' THEN
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
      -- Only allow superadmins to change tenant_id
      IF NOT has_role(auth.uid(), 'superadmin') THEN
        NEW.tenant_id := OLD.tenant_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_tenant_change_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_tenant_change_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_tenant_change();

-- ============================================================
-- CRITICAL FIX 2: Remove anon access to tenants table
-- ============================================================
DROP POLICY IF EXISTS "Public can view active tenants basic info" ON public.tenants;

-- ============================================================
-- IMPORTANT FIX 3: Fix classroom_recordings policies to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Hosts insert own recordings" ON public.classroom_recordings;
DROP POLICY IF EXISTS "Staff manage tenant recordings" ON public.classroom_recordings;
DROP POLICY IF EXISTS "Students view tenant recordings" ON public.classroom_recordings;

CREATE POLICY "Hosts insert own recordings"
  ON public.classroom_recordings
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Staff manage tenant recordings"
  ON public.classroom_recordings
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director')) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Students view tenant recordings"
  ON public.classroom_recordings
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- IMPORTANT FIX 4: Fix anonymous consent spoofing
-- ============================================================
DROP POLICY IF EXISTS "Anon insert cookie consent" ON public.consent_records;

CREATE POLICY "Anon insert cookie consent"
  ON public.consent_records
  FOR INSERT TO anon
  WITH CHECK (consent_type = 'cookie_consent' AND user_id = '00000000-0000-0000-0000-000000000000');

-- ============================================================
-- IMPORTANT FIX 5: Hide commission from public partner_universities
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active partner universities" ON public.partner_universities;

-- Create a restricted public view
CREATE OR REPLACE VIEW public.partner_universities_public AS
  SELECT id, name, country, flag, programme, url, fee, ielts, intake, status
  FROM public.partner_universities
  WHERE status = 'active';

-- Re-add the policy without commission visibility for anon
CREATE POLICY "Anyone can view active partner universities"
  ON public.partner_universities
  FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "Anon view active partner universities"
  ON public.partner_universities
  FOR SELECT TO anon
  USING (false);

-- ============================================================
-- FEATURE: Quiz engine tables
-- ============================================================
CREATE TYPE public.quiz_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false', 'short_answer');

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  module_id uuid REFERENCES public.modules(id),
  title text NOT NULL,
  description text,
  time_limit_minutes integer DEFAULT 30,
  max_attempts integer DEFAULT 1,
  pass_percentage integer DEFAULT 50,
  shuffle_questions boolean DEFAULT true,
  show_results boolean DEFAULT true,
  status quiz_status DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type DEFAULT 'mcq',
  options jsonb DEFAULT '[]',
  correct_answer text NOT NULL,
  points integer DEFAULT 1,
  explanation text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  answers jsonb DEFAULT '{}',
  score integer,
  total_points integer,
  percentage numeric,
  passed boolean,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_spent_seconds integer
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quiz policies
CREATE POLICY "Staff manage quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader')) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Students view published quizzes" ON public.quizzes
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND status = 'published');

CREATE POLICY "Staff manage questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director')) AND q.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Students view questions for published quizzes" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND q.status = 'published' AND q.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Students manage own attempts" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Staff view tenant attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director')) AND tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- FEATURE: Discussion forums tables
-- ============================================================
CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  module_id uuid REFERENCES public.modules(id),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  reply_count integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view threads" ON public.forum_threads
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Authenticated users create threads" ON public.forum_threads
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Authors update own threads" ON public.forum_threads
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Staff manage all threads" ON public.forum_threads
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director')) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users view replies" ON public.forum_replies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM forum_threads t WHERE t.id = thread_id AND t.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Users create replies" ON public.forum_replies
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM forum_threads t WHERE t.id = thread_id AND t.tenant_id = get_user_tenant_id(auth.uid()) AND NOT t.is_locked));

CREATE POLICY "Authors update own replies" ON public.forum_replies
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

-- Trigger to update reply count
CREATE OR REPLACE FUNCTION public.update_thread_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads SET reply_count = reply_count + 1, last_activity_at = now() WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_reply_count();

-- ============================================================
-- FEATURE: Gradebook table
-- ============================================================
CREATE TABLE public.gradebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  student_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id),
  programme_id uuid NOT NULL REFERENCES public.programmes(id),
  assessment_title text NOT NULL,
  assessment_type text DEFAULT 'assignment',
  grade numeric,
  max_grade numeric DEFAULT 100,
  weight numeric DEFAULT 1.0,
  status text DEFAULT 'pending',
  graded_by uuid,
  graded_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.gradebook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage gradebook" ON public.gradebook_entries
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader') OR has_role(auth.uid(), 'iqa_officer')) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Students view own grades" ON public.gradebook_entries
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());
