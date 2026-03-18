
-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  assignment_deadlines_email boolean DEFAULT true,
  assignment_deadlines_push boolean DEFAULT true,
  assignment_deadlines_sms boolean DEFAULT false,
  grade_releases_email boolean DEFAULT true,
  grade_releases_push boolean DEFAULT true,
  grade_releases_sms boolean DEFAULT false,
  fee_reminders_email boolean DEFAULT true,
  fee_reminders_push boolean DEFAULT true,
  fee_reminders_sms boolean DEFAULT true,
  attendance_warnings_email boolean DEFAULT true,
  attendance_warnings_push boolean DEFAULT true,
  attendance_warnings_sms boolean DEFAULT true,
  class_changes_email boolean DEFAULT true,
  class_changes_push boolean DEFAULT true,
  class_changes_sms boolean DEFAULT false,
  messages_email boolean DEFAULT false,
  messages_push boolean DEFAULT true,
  messages_sms boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
