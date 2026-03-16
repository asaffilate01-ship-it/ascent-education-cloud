
-- 1. Restore the handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Seed attendance records (student attending modules over last 2 weeks)
INSERT INTO attendance_records (tenant_id, student_id, module_id, date, status, method) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', CURRENT_DATE - 1, 'present', 'qr_code'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '321a0b7b-551d-4c39-bf55-e4edd70869b2', CURRENT_DATE - 1, 'present', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', CURRENT_DATE - 3, 'late', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'e115168d-fb66-42f7-90de-28277b0b08f5', CURRENT_DATE - 3, 'present', 'qr_code'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3576cbb3-4359-42ca-90d1-4819293aa26f', CURRENT_DATE - 5, 'absent', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', CURRENT_DATE - 7, 'present', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '321a0b7b-551d-4c39-bf55-e4edd70869b2', CURRENT_DATE - 7, 'present', 'qr_code'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'e115168d-fb66-42f7-90de-28277b0b08f5', CURRENT_DATE - 9, 'excused', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', CURRENT_DATE - 10, 'present', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3576cbb3-4359-42ca-90d1-4819293aa26f', CURRENT_DATE - 12, 'present', 'qr_code');

-- 3. Seed notifications for multiple users
INSERT INTO notifications (user_id, tenant_id, title, message, type, severity, read) VALUES
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Assignment Due Soon', 'Your Business Strategy report is due in 3 days.', 'academic', 'warning', false),
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Grade Released', 'Your grade for Research Methods has been published.', 'academic', 'info', false),
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fee Reminder', 'Your next instalment of £1,500 is due on April 1st.', 'finance', 'warning', true),
  ('ef6754b0-8aab-4cf9-b7f2-761137994872', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'New Submission', '3 new assignments have been submitted for marking.', 'academic', 'info', false),
  ('ef6754b0-8aab-4cf9-b7f2-761137994872', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Attendance Alert', 'Student Ahmed Khan has 3 consecutive absences.', 'attendance', 'critical', false),
  ('00831058-b0bb-4268-9e95-5ac9a14497ba', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'New Application', '5 new applications received this week.', 'admissions', 'info', false),
  ('00831058-b0bb-4268-9e95-5ac9a14497ba', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Staff Review Due', 'Quarterly staff performance reviews are due next week.', 'system', 'warning', false),
  ('66144437-5300-42c1-81f9-1d3f888cbfaf', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Overdue Invoice', '2 student invoices are now overdue totalling £4,200.', 'finance', 'critical', false),
  ('1b6fa4cc-938e-4ccb-bbfb-ec21c5d2af83', NULL, 'Platform Update', 'System maintenance scheduled for Sunday 2am-4am GMT.', 'system', 'info', false),
  ('1b6fa4cc-938e-4ccb-bbfb-ec21c5d2af83', NULL, 'New Tenant Onboarded', 'Lahore College of Business has completed onboarding.', 'system', 'info', true);

-- 4. Seed conversations & messages
DO $$
DECLARE
  conv1_id uuid := gen_random_uuid();
  conv2_id uuid := gen_random_uuid();
BEGIN
  -- Student-Lecturer conversation
  INSERT INTO conversations (id, tenant_id, type, name) VALUES
    (conv1_id, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'direct', NULL),
    (conv2_id, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'group', 'MBA Cohort 2026');

  INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (conv1_id, '02801417-df85-4b6c-9602-c7386ebada86'),
    (conv1_id, 'ef6754b0-8aab-4cf9-b7f2-761137994872'),
    (conv2_id, '02801417-df85-4b6c-9602-c7386ebada86'),
    (conv2_id, 'ef6754b0-8aab-4cf9-b7f2-761137994872'),
    (conv2_id, '00831058-b0bb-4268-9e95-5ac9a14497ba');

  INSERT INTO messages (conversation_id, sender_id, sender_name, content, read) VALUES
    (conv1_id, '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'Hi Professor, I had a question about the assignment deadline. Is there any possibility of a short extension?', false),
    (conv1_id, 'ef6754b0-8aab-4cf9-b7f2-761137994872', 'Dev Lecturer', 'Hi, I can give you a 48-hour extension. Please submit by Friday 5pm.', false),
    (conv1_id, '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'Thank you so much! I will have it ready by then.', false),
    (conv2_id, 'ef6754b0-8aab-4cf9-b7f2-761137994872', 'Dev Lecturer', 'Reminder: Guest lecture on International Business next Tuesday at 2pm in Room 301.', false),
    (conv2_id, '00831058-b0bb-4268-9e95-5ac9a14497ba', 'Dev Director', 'Please ensure all students are registered for the exam board by end of this week.', false);
END $$;
