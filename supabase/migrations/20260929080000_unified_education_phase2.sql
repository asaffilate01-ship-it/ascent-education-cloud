-- Phase 2: commerce/enrolment, corporate seats, tuition subscriptions and practical competency verification.
create table if not exists public.course_enrolment_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, course_id uuid not null references public.course_catalogue(id),
 cohort_id uuid references public.course_cohorts(id), funding_application_id uuid references public.student_funding_applications(id),
 status text not null default 'draft' check(status in ('draft','submitted','eligibility_review','payment_pending','funding_pending','approved','enrolled','rejected','withdrawn')),
 eligibility_snapshot jsonb not null default '{}'::jsonb, fee_snapshot jsonb not null default '{}'::jsonb, submitted_at timestamptz, decided_by uuid, decided_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.corporate_seat_allocations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, offer_id uuid not null references public.corporate_course_offers(id),
 employee_name text not null, employee_email text, employee_reference text, learner_user_id uuid, invitation_status text not null default 'pending',
 invited_at timestamptz, accepted_at timestamptz, unique(offer_id,employee_reference)
);
create table if not exists public.tuition_subscriptions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, track_id uuid not null references public.school_tuition_tracks(id),
 guardian_user_id uuid, subject_ids uuid[] not null default '{}', billing_cycle text not null default 'monthly' check(billing_cycle in ('monthly','term','annual','package')),
 amount_pkr numeric not null, status text not null default 'pending' check(status in ('pending','active','paused','cancelled','expired')), starts_on date, renews_on date, created_at timestamptz not null default now()
);
create table if not exists public.competency_assessments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, logbook_entry_id uuid not null references public.practical_logbook_entries(id) on delete cascade,
 assessor_id uuid not null, decision text not null check(decision in ('competent','not_yet_competent','more_evidence_required')), feedback text,
 evidence_checked jsonb not null default '[]'::jsonb, assessed_at timestamptz not null default now()
);
alter table public.course_enrolment_requests enable row level security; alter table public.corporate_seat_allocations enable row level security;
alter table public.tuition_subscriptions enable row level security; alter table public.competency_assessments enable row level security;
create policy "enrolment own read" on public.course_enrolment_requests for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "enrolment own create" on public.course_enrolment_requests for insert to authenticated with check(public.same_tenant(tenant_id) and student_id=auth.uid());
create policy "enrolment academic manage" on public.course_enrolment_requests for update to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "tuition subscriptions family read" on public.tuition_subscriptions for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or guardian_user_id=auth.uid() or public.is_academic_manager()));
create policy "competency academic read" on public.competency_assessments for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
