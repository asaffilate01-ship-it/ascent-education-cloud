
-- Lab sessions table to group lab activities
CREATE TABLE public.lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  module_id uuid REFERENCES public.modules(id),
  lecturer_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  scheduled_at timestamp with time zone,
  ended_at timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled',
  classroom_session_id uuid REFERENCES public.classroom_sessions(id),
  is_lab_mode boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Virtual machines allocated to students
CREATE TABLE public.lab_vms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  workspace_id text, -- AWS WorkSpace ID
  instance_id text, -- AWS EC2 instance ID (fallback)
  vm_name text NOT NULL,
  vm_status text NOT NULL DEFAULT 'stopped', -- stopped, starting, running, stopping, error
  os_type text NOT NULL DEFAULT 'windows', -- windows, linux
  instance_type text DEFAULT 't3.medium',
  connection_url text, -- Browser access URL
  ip_address text,
  allocated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed_at timestamp with time zone,
  lab_session_id uuid REFERENCES public.lab_sessions(id),
  specs jsonb DEFAULT '{"cpu": 2, "ram_gb": 4, "storage_gb": 50}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Screen sharing sessions for lab mode
CREATE TABLE public.lab_screen_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_session_id uuid NOT NULL REFERENCES public.lab_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL DEFAULT 'student', -- lecturer or student
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_vms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_screen_shares ENABLE ROW LEVEL SECURITY;

-- Lab sessions policies
CREATE POLICY "Lecturers manage lab sessions"
ON public.lab_sessions FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director'))
  AND tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "Tenant users view lab sessions"
ON public.lab_sessions FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Lab VMs policies
CREATE POLICY "Students view own VMs"
ON public.lab_vms FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Staff manage tenant VMs"
ON public.lab_vms FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'superadmin'))
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- Screen share policies
CREATE POLICY "Lab participants manage screen shares"
ON public.lab_screen_shares FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lab_sessions ls
    WHERE ls.id = lab_screen_shares.lab_session_id
    AND ls.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- Enable realtime for screen shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_screen_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_vms;

-- Triggers for updated_at
CREATE TRIGGER update_lab_sessions_updated_at
BEFORE UPDATE ON public.lab_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_vms_updated_at
BEFORE UPDATE ON public.lab_vms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
