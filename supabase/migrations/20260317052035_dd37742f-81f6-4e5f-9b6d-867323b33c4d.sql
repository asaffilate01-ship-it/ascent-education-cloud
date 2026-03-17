
-- 1. Academic Calendar / Events
CREATE TABLE public.academic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'event', -- event, holiday, exam, deadline, residential, meeting
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  all_day boolean NOT NULL DEFAULT true,
  location text,
  color text DEFAULT '#3b82f6',
  visible_to text[] DEFAULT '{all}', -- array of roles or 'all'
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view events" ON public.academic_events FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Directors manage events" ON public.academic_events FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader')));

-- 2. Leave Management
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  leave_type text NOT NULL DEFAULT 'annual', -- annual, sick, personal, maternity, paternity, study, other
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approved_by uuid,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own leave" ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users create own leave" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own pending leave" ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Directors manage tenant leave" ON public.leave_requests FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'centre_director'));

-- 3. Health Records
CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  blood_group text,
  allergies text[],
  medical_conditions text[],
  medications text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  doctor_name text,
  doctor_phone text,
  insurance_provider text,
  insurance_number text,
  notes text,
  last_checkup_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own health" ON public.health_records FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Students manage own health" ON public.health_records FOR ALL TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Directors view tenant health" ON public.health_records FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'centre_director'));

-- 4. Transport / GPS Tracking
CREATE TABLE public.transport_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_number text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'bus', -- bus, van, car
  capacity integer NOT NULL DEFAULT 40,
  driver_name text,
  driver_phone text,
  status text NOT NULL DEFAULT 'active', -- active, maintenance, inactive
  current_lat numeric,
  current_lng numeric,
  last_location_update timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view vehicles" ON public.transport_vehicles FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Directors manage vehicles" ON public.transport_vehicles FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'centre_director'));

CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  vehicle_id uuid REFERENCES public.transport_vehicles(id),
  stops jsonb DEFAULT '[]'::jsonb, -- array of {name, lat, lng, time}
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view routes" ON public.transport_routes FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Directors manage routes" ON public.transport_routes FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'centre_director'));

CREATE TABLE public.transport_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id),
  pickup_stop text,
  dropoff_stop text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own assignments" ON public.transport_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Directors manage assignments" ON public.transport_assignments FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'centre_director'));

-- 5. Lesson Plans
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id),
  lecturer_id uuid NOT NULL,
  title text NOT NULL,
  session_date date NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  objectives text[],
  topics text[],
  activities text,
  resources text,
  assessment_method text,
  homework text,
  notes text,
  status text NOT NULL DEFAULT 'draft', -- draft, published, completed
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecturers manage own plans" ON public.lesson_plans FOR ALL TO authenticated
  USING (lecturer_id = auth.uid());
CREATE POLICY "Directors view tenant plans" ON public.lesson_plans FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader') OR has_role(auth.uid(), 'iqa_officer')));
CREATE POLICY "Students view published plans" ON public.lesson_plans FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND status = 'published');
