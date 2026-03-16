
-- =============================================
-- 1. KYC / Document Verification table
-- =============================================
CREATE TABLE public.kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  document_type TEXT NOT NULL, -- 'passport', 'cnic', 'transcript', 'qualification', 'work_experience', 'selfie', 'reference_letter', 'english_cert'
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expiry_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
ON public.kyc_documents FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can upload own documents"
ON public.kyc_documents FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view tenant documents"
ON public.kyc_documents FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  (has_role(auth.uid(), 'admissions_admin'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Staff can verify documents"
ON public.kyc_documents FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  (has_role(auth.uid(), 'admissions_admin'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role))
);

-- =============================================
-- 2. Residential Weeks table
-- =============================================
CREATE TABLE public.residential_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL, -- 'Semester 1 Residential' / 'Semester 2 Residential'
  semester INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'active', 'completed'
  max_capacity INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.residential_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view residential weeks"
ON public.residential_weeks FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Directors manage residential weeks"
ON public.residential_weeks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'centre_director'::app_role) AND tenant_id = get_user_tenant_id(auth.uid()));

-- =============================================
-- 3. Residential Bookings (accommodation)
-- =============================================
CREATE TABLE public.residential_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  residential_week_id UUID NOT NULL REFERENCES public.residential_weeks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  room_type TEXT NOT NULL DEFAULT 'single', -- 'single', 'shared_male', 'shared_female'
  meal_plan TEXT NOT NULL DEFAULT 'full_board', -- 'full_board', 'half_board', 'self_catering'
  dietary_requirements TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  special_needs TEXT,
  check_in_at TIMESTAMP WITH TIME ZONE,
  check_out_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'booked', -- 'booked', 'checked_in', 'checked_out', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.residential_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own bookings"
ON public.residential_bookings FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students create own bookings"
ON public.residential_bookings FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update own bookings"
ON public.residential_bookings FOR UPDATE TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Staff manage tenant bookings"
ON public.residential_bookings FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'admissions_admin'::app_role))
);

-- =============================================
-- 4. Residential Sessions (timetable)
-- =============================================
CREATE TABLE public.residential_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  residential_week_id UUID NOT NULL REFERENCES public.residential_weeks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL DEFAULT 'workshop', -- 'workshop', 'lecture', 'group_project', 'tutor_meeting', 'exam', 'social', 'meal'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  lecturer_id UUID,
  module_id UUID REFERENCES public.modules(id),
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.residential_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view sessions"
ON public.residential_sessions FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Directors manage sessions"
ON public.residential_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'centre_director'::app_role) AND tenant_id = get_user_tenant_id(auth.uid()));

-- =============================================
-- 5. Audit Log table
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'verify', 'approve', 'reject'
  entity_type TEXT NOT NULL, -- 'application', 'student', 'invoice', 'submission', 'enrolment', etc.
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Directors view tenant audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  has_role(auth.uid(), 'centre_director'::app_role)
);

CREATE POLICY "System inserts audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- =============================================
-- 6. Compliance Checklists table
-- =============================================
CREATE TABLE public.compliance_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  awarding_body TEXT NOT NULL, -- 'OTHM', 'QUALIFI', 'IAB'
  category TEXT NOT NULL, -- 'centre_approval', 'ongoing_quality', 'assessment', 'iqa', 'eqa', 'safeguarding', 'policies'
  item_title TEXT NOT NULL,
  item_description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  evidence_url TEXT,
  evidence_notes TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view tenant compliance"
ON public.compliance_checklists FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'iqa_officer'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "QA staff manage compliance"
ON public.compliance_checklists FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND
  (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'iqa_officer'::app_role))
);

CREATE POLICY "Superadmins manage all compliance"
ON public.compliance_checklists FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

CREATE POLICY "Users upload own KYC docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own KYC docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff view tenant KYC docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (has_role(auth.uid(), 'admissions_admin'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);
