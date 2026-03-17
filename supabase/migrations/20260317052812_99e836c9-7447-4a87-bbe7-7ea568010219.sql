
-- Table for tracking student video views
CREATE TABLE public.resource_view_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  resource_title text NOT NULL,
  resource_type text NOT NULL DEFAULT 'recording',
  module_name text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_view_logs ENABLE ROW LEVEL SECURITY;

-- Students can insert their own view logs
CREATE POLICY "Students log own views"
ON public.resource_view_logs FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can update their own view logs (to update duration)
CREATE POLICY "Students update own views"
ON public.resource_view_logs FOR UPDATE
TO authenticated
USING (student_id = auth.uid());

-- Students can view their own logs
CREATE POLICY "Students view own logs"
ON public.resource_view_logs FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Staff can view tenant view logs
CREATE POLICY "Staff view tenant logs"
ON public.resource_view_logs FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'centre_director') OR
    has_role(auth.uid(), 'lecturer') OR
    has_role(auth.uid(), 'programme_leader')
  )
);
