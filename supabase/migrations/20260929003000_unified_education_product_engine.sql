-- Unified education product engine: regulated pathways, Pakistan skills, employer academy and school tuition.
create table if not exists public.course_product_config (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null references public.course_catalogue(id) on delete cascade,
 academic_engine text not null check(academic_engine in ('regulated_assignment','competency_nvq','tuition_school','short_course','corporate_learning')),
 certification_label text, regulator_or_awarder text, externally_regulated boolean not null default false,
 marketing_approval_required boolean not null default true, residential_weeks numeric not null default 0,
 parent_portal_enabled boolean not null default false, careers_enabled boolean not null default true,
 funding_enabled boolean not null default true, practical_logbook_enabled boolean not null default false,
 unique(tenant_id,course_id)
);
create table if not exists public.course_cohorts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null references public.course_catalogue(id),
 cohort_reference text not null, city text, delivery_mode text not null, starts_on date, ends_on date, capacity integer,
 payment_model text not null default 'student_paid' check(payment_model in ('student_paid','employer_paid','government_funded','donor_funded','unipathway_scholarship','mixed')),
 student_fee_pkr numeric not null default 0, sponsor_fee_pkr numeric not null default 0, status text not null default 'planned',
 unique(tenant_id,cohort_reference)
);
create table if not exists public.practical_logbook_entries (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, course_id uuid not null references public.course_catalogue(id),
 cohort_id uuid references public.course_cohorts(id), partner_id uuid references public.partner_directory(id), competency_code text,
 activity_date date not null, hours numeric not null default 0, evidence_reference text, supervisor_name text, supervisor_signoff boolean not null default false,
 assessor_status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists public.corporate_learners (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, corporate_account_id uuid not null references public.corporate_learning_accounts(id),
 course_offer_id uuid references public.corporate_course_offers(id), learner_user_id uuid, employee_reference text, department text,
 manager_reference text, status text not null default 'invited', enrolled_at timestamptz, completed_at timestamptz
);
create table if not exists public.tuition_progress_snapshots (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, track_id uuid not null references public.school_tuition_tracks(id),
 subject_id uuid not null references public.school_tuition_subjects(id), period_start date not null, period_end date not null,
 attendance_pct numeric, homework_pct numeric, quiz_pct numeric, mock_pct numeric, weak_topics jsonb not null default '[]'::jsonb,
 strengths jsonb not null default '[]'::jsonb, teacher_comment text, created_at timestamptz not null default now()
);
alter table public.course_product_config enable row level security; alter table public.course_cohorts enable row level security;
alter table public.practical_logbook_entries enable row level security; alter table public.corporate_learners enable row level security; alter table public.tuition_progress_snapshots enable row level security;
create policy "product config tenant read" on public.course_product_config for select to authenticated using(public.same_tenant(tenant_id));
create policy "product config academic manage" on public.course_product_config for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "cohorts tenant read" on public.course_cohorts for select to authenticated using(public.same_tenant(tenant_id));
create policy "cohorts academic manage" on public.course_cohorts for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "practical log own read" on public.practical_logbook_entries for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "tuition progress own guardian read" on public.tuition_progress_snapshots for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager() or exists(select 1 from public.parent_student_links p where p.student_id=tuition_progress_snapshots.student_id and p.parent_id=auth.uid() and p.verified=true)));
