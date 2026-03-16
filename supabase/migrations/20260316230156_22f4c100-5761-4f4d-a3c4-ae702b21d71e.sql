
-- Partner Universities table
CREATE TABLE public.partner_universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL DEFAULT '🏳️',
  programme TEXT NOT NULL,
  intake TEXT,
  ielts TEXT,
  fee TEXT,
  url TEXT NOT NULL,
  commission TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partner universities"
ON public.partner_universities FOR SELECT
USING (status = 'active');

CREATE POLICY "Superadmins manage partner universities"
ON public.partner_universities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Job Listings table
CREATE TABLE public.job_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Full-time',
  location TEXT NOT NULL,
  deadline TEXT,
  salary TEXT,
  url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job listings"
ON public.job_listings FOR SELECT
USING (status = 'active');

CREATE POLICY "Employer partners and directors manage jobs"
ON public.job_listings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'employer_partner'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Classroom Sessions table (persist Jitsi rooms)
CREATE TABLE public.classroom_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  host_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  module_id UUID REFERENCES public.modules(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view classroom sessions"
ON public.classroom_sessions FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) OR host_id = auth.uid());

CREATE POLICY "Authenticated users can create sessions"
ON public.classroom_sessions FOR INSERT
TO authenticated
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update own sessions"
ON public.classroom_sessions FOR UPDATE
TO authenticated
USING (host_id = auth.uid());

-- Enable realtime for classroom sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_sessions;
