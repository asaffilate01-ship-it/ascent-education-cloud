
-- Create e-signatures table
CREATE TABLE IF NOT EXISTS public.e_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  full_name TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.e_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can sign documents" ON public.e_signatures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own signatures" ON public.e_signatures FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Staff view tenant signatures" ON public.e_signatures FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'admissions_admin') OR has_role(auth.uid(), 'superadmin')
  ));

-- Create plagiarism_reports table
CREATE TABLE IF NOT EXISTS public.plagiarism_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  ai_generated_score INTEGER NOT NULL DEFAULT 0,
  similarity_sources JSONB DEFAULT '[]'::jsonb,
  flagged_passages JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  analyzed_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plagiarism_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage plagiarism reports" ON public.plagiarism_reports FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'iqa_officer')
  ));
CREATE POLICY "Students view own reports" ON public.plagiarism_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM submissions s WHERE s.id = plagiarism_reports.submission_id AND s.student_id = auth.uid()
  ));

-- Create parent_student_links table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'parent',
  verified BOOLEAN NOT NULL DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view own links" ON public.parent_student_links FOR SELECT TO authenticated
  USING (parent_id = auth.uid());
CREATE POLICY "Staff manage parent links" ON public.parent_student_links FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'admissions_admin')
  ));
CREATE POLICY "Parents can request link" ON public.parent_student_links FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid() AND has_role(auth.uid(), 'parent_guardian'));

-- Add user_presence for online/typing status
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  typing_in UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view presence" ON public.user_presence FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users update own presence" ON public.user_presence FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for presence only (messages already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
