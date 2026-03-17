
-- Lecture scheduling table
CREATE TABLE public.scheduled_lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text DEFAULT 'Virtual',
  color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  academic_year text NOT NULL DEFAULT to_char(now(), 'YYYY'),
  semester smallint NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 3),
  recurrence text NOT NULL DEFAULT 'weekly' CHECK (recurrence IN ('weekly', 'biweekly', 'once')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_duration CHECK (end_time - start_time = interval '1 hour 30 minutes'),
  CONSTRAINT valid_teaching_hours CHECK (
    (start_time >= '09:00' AND end_time <= '12:00') OR
    (start_time >= '14:00' AND end_time <= '17:00') OR
    (start_time >= '18:00' AND end_time <= '21:00')
  )
);

-- Conflict prevention indexes
CREATE UNIQUE INDEX idx_no_lecturer_conflict 
  ON public.scheduled_lectures (lecturer_id, day_of_week, start_time, academic_year, semester) 
  WHERE is_active = true;

CREATE UNIQUE INDEX idx_no_room_conflict 
  ON public.scheduled_lectures (tenant_id, room, day_of_week, start_time, academic_year, semester) 
  WHERE is_active = true AND room != 'Virtual';

CREATE INDEX idx_scheduled_lectures_module ON public.scheduled_lectures(module_id);
CREATE INDEX idx_scheduled_lectures_tenant ON public.scheduled_lectures(tenant_id);
CREATE INDEX idx_scheduled_lectures_lecturer ON public.scheduled_lectures(lecturer_id);

ALTER TABLE public.scheduled_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users view schedules"
  ON public.scheduled_lectures FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Directors and lecturers manage schedules"
  ON public.scheduled_lectures FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader') OR lecturer_id = auth.uid())
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Superadmins manage all schedules"
  ON public.scheduled_lectures FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER update_scheduled_lectures_updated_at
  BEFORE UPDATE ON public.scheduled_lectures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lecture reminder dedup table
CREATE TABLE public.lecture_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_lecture_id uuid NOT NULL REFERENCES public.scheduled_lectures(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('20min', '10min')),
  lecture_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scheduled_lecture_id, reminder_type, lecture_date)
);

ALTER TABLE public.lecture_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own reminders"
  ON public.lecture_reminders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM scheduled_lectures sl
    WHERE sl.id = lecture_reminders.scheduled_lecture_id
    AND (sl.lecturer_id = auth.uid() OR sl.tenant_id = get_user_tenant_id(auth.uid()))
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_lectures;

-- Auto-schedule function: assigns 8 x 1.5hr slots per module per week
CREATE OR REPLACE FUNCTION public.auto_schedule_module(
  _module_id uuid,
  _lecturer_id uuid,
  _tenant_id uuid,
  _academic_year text DEFAULT to_char(now(), 'YYYY'),
  _semester smallint DEFAULT 1,
  _color text DEFAULT '#3b82f6'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slot record;
  slots_needed int := 8;
  slots_assigned int := 0;
  assigned_slots jsonb := '[]'::jsonb;
  available_slots CURSOR FOR
    SELECT d.day, t.start_t, t.end_t
    FROM (VALUES (1),(2),(3),(4),(5)) AS d(day),
         (VALUES 
           ('09:00'::time, '10:30'::time),
           ('10:30'::time, '12:00'::time),
           ('14:00'::time, '15:30'::time),
           ('15:30'::time, '17:00'::time),
           ('18:00'::time, '19:30'::time),
           ('19:30'::time, '21:00'::time)
         ) AS t(start_t, end_t)
    WHERE NOT EXISTS (
      SELECT 1 FROM scheduled_lectures sl
      WHERE sl.lecturer_id = _lecturer_id
        AND sl.day_of_week = d.day
        AND sl.start_time = t.start_t
        AND sl.academic_year = _academic_year
        AND sl.semester = _semester
        AND sl.is_active = true
    )
    ORDER BY d.day, t.start_t;
BEGIN
  DELETE FROM scheduled_lectures
  WHERE module_id = _module_id AND academic_year = _academic_year AND semester = _semester;

  OPEN available_slots;
  LOOP
    EXIT WHEN slots_assigned >= slots_needed;
    FETCH available_slots INTO slot;
    EXIT WHEN NOT FOUND;

    INSERT INTO scheduled_lectures (module_id, lecturer_id, tenant_id, day_of_week, start_time, end_time, academic_year, semester, color)
    VALUES (_module_id, _lecturer_id, _tenant_id, slot.day, slot.start_t, slot.end_t, _academic_year, _semester, _color);

    assigned_slots := assigned_slots || jsonb_build_object('day', slot.day, 'start', slot.start_t::text, 'end', slot.end_t::text);
    slots_assigned := slots_assigned + 1;
  END LOOP;
  CLOSE available_slots;

  RETURN jsonb_build_object('module_id', _module_id, 'slots_assigned', slots_assigned, 'slots_needed', slots_needed, 'schedule', assigned_slots);
END;
$$;

-- Notify on new lecture schedule
CREATE OR REPLACE FUNCTION public.notify_lecture_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mod_title text;
  day_names text[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  day_label text;
  time_label text;
  student record;
BEGIN
  SELECT title INTO mod_title FROM modules WHERE id = NEW.module_id;
  day_label := day_names[NEW.day_of_week];
  time_label := to_char(NEW.start_time, 'HH24:MI') || '-' || to_char(NEW.end_time, 'HH24:MI');

  INSERT INTO notifications (user_id, tenant_id, title, message, type, severity)
  VALUES (NEW.lecturer_id, NEW.tenant_id, 'Lecture Scheduled', 
    mod_title || ' scheduled on ' || day_label || ' ' || time_label || ' PKT', 'academic', 'info');

  FOR student IN
    SELECT se.student_id FROM student_enrolments se
    JOIN modules m ON m.programme_id = se.programme_id
    WHERE m.id = NEW.module_id AND se.status = 'active'
  LOOP
    INSERT INTO notifications (user_id, tenant_id, title, message, type, severity)
    VALUES (student.student_id, NEW.tenant_id, 'New Lecture Scheduled',
      mod_title || ' on ' || day_label || ' ' || time_label || ' PKT', 'academic', 'info');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lecture_scheduled
  AFTER INSERT ON public.scheduled_lectures
  FOR EACH ROW EXECUTE FUNCTION public.notify_lecture_scheduled();
