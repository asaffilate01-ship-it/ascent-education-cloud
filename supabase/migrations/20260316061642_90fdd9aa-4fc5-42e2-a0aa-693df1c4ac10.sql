
-- PHASE 23: Rich Platform Data Seeding

-- ① Add more tenants for Landlord dashboard
INSERT INTO public.tenants (id, name, slug, plan, status, students_count, monthly_revenue, primary_color, accent_color, brand_name) VALUES
  ('b2b2b2b2-0001-4000-a000-000000000001', 'Manchester Academy of Business', 'mab-academy', 'enterprise', 'active', 420, 8500, '#1E3A5F', '#F0A500', 'MAB Academy'),
  ('b2b2b2b2-0002-4000-a000-000000000002', 'Bristol Institute of Technology', 'bristol-tech', 'professional', 'active', 185, 3200, '#2D5016', '#8BC34A', 'Bristol Tech'),
  ('b2b2b2b2-0003-4000-a000-000000000003', 'Edinburgh Learning Hub', 'edinburgh-hub', 'starter', 'onboarding', 0, 0, '#4A148C', '#CE93D8', 'Edinburgh Hub'),
  ('b2b2b2b2-0004-4000-a000-000000000004', 'Cardiff Business School', 'cardiff-biz', 'professional', 'active', 290, 4500, '#B71C1C', '#EF5350', 'Cardiff Biz'),
  ('b2b2b2b2-0005-4000-a000-000000000005', 'Glasgow Training Centre', 'glasgow-tc', 'starter', 'suspended', 45, 200, '#004D40', '#26A69A', 'Glasgow TC')
ON CONFLICT DO NOTHING;

UPDATE public.tenants SET students_count = 310, monthly_revenue = 6200 WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ② More applications across the full funnel
INSERT INTO public.applications (tenant_id, student_name, email, stage, programme_name, source, counsellor, level, phone, notes) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aisha Malik', 'aisha.m@gmail.com', 'lead', 'Level 5 Diploma in Business Management', 'Website', 'Sarah Admin', 'Level 5', '+44 7700 100001', 'Enquired via website form'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James O''Brien', 'james.ob@outlook.com', 'contacted', 'Level 4 Diploma in Computing', 'Agent Referral', 'Sarah Admin', 'Level 4', '+44 7700 100002', 'Called back, interested in Jan intake'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Priya Sharma', 'priya.s@yahoo.com', 'qualified', 'Level 5 Diploma in Marketing', 'Social Media', 'Sarah Admin', 'Level 5', '+44 7700 100003', 'Has relevant work experience'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mohammed Ali', 'm.ali@hotmail.com', 'applied', 'Level 5 Diploma in Business Management', 'Walk-in', 'Sarah Admin', 'Level 5', '+44 7700 100004', 'Documents submitted'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophie Williams', 'sophie.w@gmail.com', 'under_review', 'Level 4 Diploma in Business Management', 'Website', 'Sarah Admin', 'Level 4', '+44 7700 100005', 'Pending IELTS verification'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tomasz Kowalski', 't.kowalski@gmail.com', 'conditional_offer', 'Level 5 Diploma in Computing', 'Agent Referral', 'Sarah Admin', 'Level 5', '+44 7700 100006', 'Conditional on English proficiency'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fatima Hassan', 'fatima.h@outlook.com', 'unconditional_offer', 'Level 3 Diploma in Accounting', 'Open Day', 'Sarah Admin', 'Level 3', '+44 7700 100007', 'All conditions met'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'David Chen', 'd.chen@gmail.com', 'deposit_paid', 'Level 5 Diploma in Business Management', 'Partner Uni', 'Sarah Admin', 'Level 5', '+44 7700 100008', '500 deposit received'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Elena Popescu', 'elena.p@yahoo.com', 'enrolled', 'Level 4 Diploma in Computing', 'Agent Referral', 'Sarah Admin', 'Level 4', '+44 7700 100009', 'Fully enrolled, Jan 2026 cohort'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Raj Patel', 'raj.p@gmail.com', 'enrolled', 'Level 5 Diploma in Marketing', 'Website', 'Sarah Admin', 'Level 5', '+44 7700 100010', 'Scholarship recipient'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lucy Thompson', 'lucy.t@hotmail.com', 'lost', 'Level 3 Diploma in IT', 'Social Media', 'Sarah Admin', 'Level 3', '+44 7700 100011', 'Chose competitor'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Omar Farooq', 'omar.f@gmail.com', 'deferred', 'Level 5 Diploma in Business Management', 'Walk-in', 'Sarah Admin', 'Level 5', '+44 7700 100012', 'Deferred to Sep 2026'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hannah Green', 'hannah.g@gmail.com', 'applied', 'Level 5 Diploma in Computing', 'Open Day', 'Sarah Admin', 'Level 5', '+44 7700 100013', 'Strong academic background'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Carlos Rivera', 'carlos.r@outlook.com', 'lead', 'Level 4 Diploma in Business Management', 'Website', NULL, 'Level 4', '+44 7700 100014', NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Zara Ahmed', 'zara.a@gmail.com', 'conditional_offer', 'Level 3 Diploma in Accounting', 'Agent Referral', 'Sarah Admin', 'Level 3', '+44 7700 100015', 'Awaiting CAS letter')
ON CONFLICT DO NOTHING;

-- ③ More invoices
INSERT INTO public.invoices (tenant_id, student_name, amount, paid, status, type, due_date, instalments) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aisha Malik', 4500, 4500, 'paid', 'tuition', '2026-01-15', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James O''Brien', 3800, 1900, 'partial', 'tuition', '2026-02-28', 4),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Priya Sharma', 4500, 0, 'pending', 'tuition', '2026-04-01', 3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mohammed Ali', 3200, 0, 'overdue', 'tuition', '2026-01-31', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophie Williams', 500, 500, 'paid', 'deposit', '2026-01-10', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tomasz Kowalski', 150, 150, 'paid', 'exam', '2026-03-01', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'David Chen', 500, 500, 'paid', 'deposit', '2026-02-01', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Elena Popescu', 4500, 3000, 'partial', 'tuition', '2026-03-15', 3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dev Agent', 750, 0, 'pending', 'commission', '2026-04-01', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dev Agent', 500, 500, 'paid', 'commission', '2026-01-15', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Raj Patel', 4500, 4500, 'paid', 'tuition', '2026-01-01', 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lucy Thompson', 500, 500, 'refunded', 'deposit', '2025-12-01', 1)
ON CONFLICT DO NOTHING;

-- ④ More submissions
INSERT INTO public.submissions (tenant_id, assignment_id, student_id, student_name, status, grade, feedback, plagiarism_score, word_count, graded_by, graded_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000001', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'graded', 72, 'Good analysis of strategic frameworks.', 8, 3200, 'ef6754b0-8aab-4cf9-b7f2-761137994872', NOW() - INTERVAL '5 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000002', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'graded', 65, 'Accurate calculations but lacking commentary.', 3, 2800, 'ef6754b0-8aab-4cf9-b7f2-761137994872', NOW() - INTERVAL '3 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000003', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'submitted', NULL, NULL, NULL, 3500, NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000004', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'graded', 58, 'Group contribution noted.', 12, 4100, 'ef6754b0-8aab-4cf9-b7f2-761137994872', NOW() - INTERVAL '10 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000005', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'submitted', NULL, NULL, NULL, 2900, NULL, NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a0000000-0000-0000-0000-000000000006', '02801417-df85-4b6c-9602-c7386ebada86', 'Dev Student', 'graded', 78, 'Excellent project proposal.', 5, 3600, 'ef6754b0-8aab-4cf9-b7f2-761137994872', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ⑤ More attendance records
INSERT INTO public.attendance_records (tenant_id, student_id, module_id, date, status, method) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', '2026-03-10', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '321a0b7b-551d-4c39-bf55-e4edd70869b2', '2026-03-10', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'e115168d-fb66-42f7-90de-28277b0b08f5', '2026-03-11', 'late', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3576cbb3-4359-42ca-90d1-4819293aa26f', '2026-03-11', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'ffafd8b1-f41b-43ad-9fb2-c276d6f51c20', '2026-03-12', 'absent', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '4755c759-da15-4ad7-9b68-1374fd98bd7b', '2026-03-12', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3c0acc40-2177-4c80-a2f5-3aab916cfede', '2026-03-13', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '321a0b7b-551d-4c39-bf55-e4edd70869b2', '2026-03-13', 'excused', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'e115168d-fb66-42f7-90de-28277b0b08f5', '2026-03-14', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '3576cbb3-4359-42ca-90d1-4819293aa26f', '2026-03-14', 'present', 'biometric'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', 'ffafd8b1-f41b-43ad-9fb2-c276d6f51c20', '2026-03-15', 'present', 'QR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '02801417-df85-4b6c-9602-c7386ebada86', '4755c759-da15-4ad7-9b68-1374fd98bd7b', '2026-03-15', 'late', 'manual')
ON CONFLICT DO NOTHING;

-- ⑥ More notifications
INSERT INTO public.notifications (user_id, tenant_id, title, message, type, severity, read) VALUES
  ('00831058-b0bb-4268-9e95-5ac9a14497ba', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'New Enrolment', 'Elena Popescu has completed enrolment for Level 4 Computing.', 'academic', 'info', false),
  ('00831058-b0bb-4268-9e95-5ac9a14497ba', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Overdue Invoice Alert', 'Mohammed Ali has an overdue invoice of 3200.', 'finance', 'warning', false),
  ('00831058-b0bb-4268-9e95-5ac9a14497ba', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'QA Sampling Due', 'IQA sampling for Level 5 Business Management is due this week.', 'compliance', 'warning', false),
  ('ef6754b0-8aab-4cf9-b7f2-761137994872', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'New Submission', 'Dev Student submitted Marketing Environment Report.', 'academic', 'info', false),
  ('ef6754b0-8aab-4cf9-b7f2-761137994872', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Attendance Alert', 'Dev Student missed Research Methods class on 12 March.', 'attendance', 'warning', false),
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Grade Published', 'Your IT Project Proposal has been graded: 78%.', 'academic', 'info', false),
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Payment Reminder', 'Your next instalment of 1500 is due on 1 April 2026.', 'finance', 'warning', false),
  ('02801417-df85-4b6c-9602-c7386ebada86', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'New Assignment', 'Organisational Behaviour Case Study has been published. Deadline: 30 April.', 'academic', 'info', false),
  ('66144437-5300-42c1-81f9-1d3f888cbfaf', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Commission Approved', 'Agent commission of 500 has been processed.', 'finance', 'info', true),
  ('66144437-5300-42c1-81f9-1d3f888cbfaf', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Overdue Report', '2 invoices are overdue totalling 3200.', 'finance', 'warning', false),
  ('1b6fa4cc-938e-4ccb-bbfb-ec21c5d2af83', NULL, 'New Centre Application', 'Edinburgh Learning Hub has started the onboarding process.', 'system', 'info', false),
  ('1b6fa4cc-938e-4ccb-bbfb-ec21c5d2af83', NULL, 'Centre Suspended', 'Glasgow Training Centre has been suspended due to non-payment.', 'system', 'warning', false),
  ('b405a58e-07e5-4b69-95c1-58c62b653c0a', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lead Converted', 'Tomasz Kowalski has received a conditional offer.', 'admissions', 'info', false),
  ('b405a58e-07e5-4b69-95c1-58c62b653c0a', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Commission Payment', 'Your commission of 500 has been paid.', 'finance', 'info', true)
ON CONFLICT DO NOTHING;
