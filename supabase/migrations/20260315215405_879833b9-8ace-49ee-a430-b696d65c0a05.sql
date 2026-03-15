
-- Notifications table for real-time alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see own notifications
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark own notifications as read
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Staff can insert notifications for tenant users
CREATE POLICY "Staff insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    OR user_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed some demo notifications for the demo tenant
INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity, read, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  t.id,
  n.title,
  n.message,
  n.type,
  n.severity,
  n.read,
  now() - (n.offset_min || ' minutes')::interval
FROM public.tenants t
CROSS JOIN (VALUES
  ('Assignment deadline approaching', 'Business Strategy Report is due in 3 days', 'academic', 'warning', false, 10),
  ('Fee instalment due', 'Your next instalment of £400 is due on March 20', 'finance', 'urgent', false, 60),
  ('New message from Dr. Khan', 'Please review the updated slides for Week 9', 'academic', 'info', false, 120),
  ('Grade released', 'Marketing Environment Report graded: 72% (Merit)', 'academic', 'success', true, 300),
  ('Attendance warning', 'Your attendance in Strategic Management is 75%', 'academic', 'warning', true, 1440),
  ('Payment received', 'Payment of £400 received for instalment 3/6', 'finance', 'success', true, 7200)
) AS n(title, message, type, severity, read, offset_min)
WHERE t.slug = 'al-khair'
LIMIT 6;
