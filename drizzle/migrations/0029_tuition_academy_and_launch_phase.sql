CREATE TABLE IF NOT EXISTS public.school_tuition_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 title text NOT NULL,
 curriculum_route text NOT NULL CHECK (curriculum_route IN ('FBISE','Punjab_BISE','Sindh_BISE','KPK_BISE','Balochistan_BISE','AKU_EB','Cambridge_OL','Cambridge_IGCSE','Cambridge_AL','Edexcel_IGCSE','Edexcel_IAL','Other')),
 grade integer NOT NULL CHECK (grade BETWEEN 9 AND 12),
 stream text,
 city text,
 delivery_modes text[] NOT NULL DEFAULT ARRAY['online','centre']::text[],
 launch_phase smallint NOT NULL DEFAULT 1 CHECK (launch_phase IN (1,2)),
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT school_tuition_tracks_unique UNIQUE NULLS NOT DISTINCT (tenant_id, curriculum_route, grade, stream)
);
CREATE TABLE IF NOT EXISTS public.school_tuition_subjects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 track_id uuid NOT NULL REFERENCES public.school_tuition_tracks(id) ON DELETE CASCADE,
 subject text NOT NULL,
 subject_group text CHECK (subject_group IN ('Sciences','Mathematics','English','Technology','Commerce','Other')),
 syllabus_version text,
 exam_board text,
 practical_required boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 UNIQUE (track_id, subject)
);
CREATE TABLE IF NOT EXISTS public.tuition_enrolments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 student_id uuid NOT NULL,
 track_id uuid NOT NULL REFERENCES public.school_tuition_tracks(id),
 subject_ids uuid[] NOT NULL DEFAULT '{}',
 package_type text NOT NULL DEFAULT 'subject',
 fee_pkr numeric,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','withdrawn')),
 guardian_user_id uuid,
 starts_on date,
 ends_on date,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tuition_mock_exams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 subject_id uuid NOT NULL REFERENCES public.school_tuition_subjects(id) ON DELETE CASCADE,
 title text NOT NULL,
 scheduled_at timestamptz,
 duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 600),
 total_marks numeric,
 delivery_mode text NOT NULL DEFAULT 'online' CHECK (delivery_mode IN ('online','centre')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','completed','cancelled'))
);
CREATE TABLE IF NOT EXISTS public.tuition_progress_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 student_id uuid NOT NULL,
 track_id uuid NOT NULL REFERENCES public.school_tuition_tracks(id),
 subject_id uuid NOT NULL REFERENCES public.school_tuition_subjects(id),
 period_start date NOT NULL,
 period_end date NOT NULL CHECK (period_end >= period_start),
 attendance_pct numeric CHECK (attendance_pct IS NULL OR attendance_pct BETWEEN 0 AND 100),
 homework_pct numeric CHECK (homework_pct IS NULL OR homework_pct BETWEEN 0 AND 100),
 quiz_pct numeric CHECK (quiz_pct IS NULL OR quiz_pct BETWEEN 0 AND 100),
 mock_pct numeric CHECK (mock_pct IS NULL OR mock_pct BETWEEN 0 AND 100),
 weak_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
 strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
 teacher_comment text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_tuition_subjects_track ON public.school_tuition_subjects(track_id);
CREATE INDEX IF NOT EXISTS tuition_enrolments_student ON public.tuition_enrolments(student_id);
CREATE INDEX IF NOT EXISTS tuition_progress_student ON public.tuition_progress_snapshots(student_id, period_end DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_tuition_tracks, public.school_tuition_subjects, public.tuition_enrolments, public.tuition_mock_exams, public.tuition_progress_snapshots TO authenticated;
GRANT ALL ON public.school_tuition_tracks, public.school_tuition_subjects, public.tuition_enrolments, public.tuition_mock_exams, public.tuition_progress_snapshots TO service_role;

ALTER TABLE public.school_tuition_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tuition_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tuition tracks centre read" ON public.school_tuition_tracks FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (active OR public.is_academic_manager()));
CREATE POLICY "Tuition tracks academic manage" ON public.school_tuition_tracks FOR ALL TO authenticated
 USING (public.same_tenant(tenant_id) AND public.is_academic_manager())
 WITH CHECK (public.same_tenant(tenant_id) AND public.is_academic_manager());

CREATE POLICY "Tuition subjects centre read" ON public.school_tuition_subjects FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id));
CREATE POLICY "Tuition subjects academic manage" ON public.school_tuition_subjects FOR ALL TO authenticated
 USING (public.same_tenant(tenant_id) AND public.is_academic_manager())
 WITH CHECK (public.same_tenant(tenant_id) AND public.is_academic_manager());

CREATE POLICY "Tuition enrolments own guardian read" ON public.tuition_enrolments FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (student_id = auth.uid() OR guardian_user_id = auth.uid() OR public.is_academic_manager()));
CREATE POLICY "Tuition enrolments academic manage" ON public.tuition_enrolments FOR ALL TO authenticated
 USING (public.same_tenant(tenant_id) AND public.is_academic_manager())
 WITH CHECK (public.same_tenant(tenant_id) AND public.is_academic_manager());

CREATE POLICY "Tuition mocks centre read" ON public.tuition_mock_exams FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id));
CREATE POLICY "Tuition mocks academic manage" ON public.tuition_mock_exams FOR ALL TO authenticated
 USING (public.same_tenant(tenant_id) AND public.is_academic_manager())
 WITH CHECK (public.same_tenant(tenant_id) AND public.is_academic_manager());

CREATE POLICY "Tuition progress own guardian read" ON public.tuition_progress_snapshots FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (student_id = auth.uid() OR public.is_academic_manager()
  OR EXISTS (SELECT 1 FROM public.parent_student_links p WHERE p.student_id = tuition_progress_snapshots.student_id AND p.parent_id = auth.uid() AND p.verified = true)));
CREATE POLICY "Tuition progress academic manage" ON public.tuition_progress_snapshots FOR ALL TO authenticated
 USING (public.same_tenant(tenant_id) AND public.is_academic_manager())
 WITH CHECK (public.same_tenant(tenant_id) AND public.is_academic_manager());

ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS launch_phase smallint CHECK (launch_phase IS NULL OR launch_phase IN (1,2));
COMMENT ON COLUMN public.programmes.launch_phase IS 'Launch phase: 1 = Phase 1 launch (OTHM/Qualifi Business and Accounting Levels 3-5), 2 = Phase 2.';
UPDATE public.programmes SET launch_phase = CASE
 WHEN awarding_body::text IN ('OTHM','QUALIFI')
  AND title ~* '(business|accounting|accountancy)' AND title !~* '(computing|information technology)'
  AND substring(coalesce(level, title) from '(?i)level\s*([0-9])')::int BETWEEN 3 AND 5 THEN 1
 ELSE 2 END
WHERE launch_phase IS NULL;