-- Create table for classroom recordings
CREATE TABLE public.classroom_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.classroom_sessions(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  room_name TEXT NOT NULL,
  host_id UUID NOT NULL,
  host_name TEXT,
  recording_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  file_size_mb NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_recordings ENABLE ROW LEVEL SECURITY;

-- Staff can manage recordings for their tenant
CREATE POLICY "Staff manage tenant recordings"
ON public.classroom_recordings
FOR ALL
USING (
  (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director'))
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- Students can view recordings for their tenant
CREATE POLICY "Students view tenant recordings"
ON public.classroom_recordings
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Hosts can insert their own recordings
CREATE POLICY "Hosts insert own recordings"
ON public.classroom_recordings
FOR INSERT
WITH CHECK (host_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_classroom_recordings_updated_at
BEFORE UPDATE ON public.classroom_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add recording_url column to classroom_sessions for quick reference
ALTER TABLE public.classroom_sessions ADD COLUMN IF NOT EXISTS recording_url TEXT;