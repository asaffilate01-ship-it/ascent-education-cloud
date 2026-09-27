-- Staff talent pool, verification, safeguarding and scheduling.
create table if not exists public.staff_candidates (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, full_name text not null, email text not null,
 phone text, city text, status text not null default 'applied' check(status in ('applied','screening','kyc_pending','verified','academic_review','teaching_review','approved','rejected','talent_pool')),
 cv_reference text, teaching_video_reference text, english_teaching_score numeric, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.staff_verifications (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, candidate_id uuid not null references public.staff_candidates(id) on delete cascade,
 verification_type text not null check(verification_type in ('identity','nadra','qualification','certificate','employment','reference','experience','safeguarding')),
 provider text, reference text, status text not null default 'pending' check(status in ('pending','verified','discrepancy','rejected','manual_review')),
 evidence_reference text, verified_by uuid, verified_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.staff_competencies (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, candidate_id uuid not null references public.staff_candidates(id) on delete cascade,
 subject_area text not null, skill text, level text, years_experience numeric, qualification_level text, evidence_reference text,
 reviewer_score numeric, approved boolean not null default false, reviewed_by uuid, reviewed_at timestamptz
);
create table if not exists public.staff_availability (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null, day_of_week integer not null check(day_of_week between 0 and 6),
 start_time time not null, end_time time not null, timezone text not null default 'Asia/Karachi', delivery_mode text not null default 'online' check(delivery_mode in ('online','centre','both')),
 effective_from date, effective_to date, max_hours_per_week numeric, preference text, active boolean not null default true
);
create table if not exists public.module_staff_eligibility (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid not null references public.modules(id) on delete cascade, user_id uuid not null,
 eligibility_score numeric, reasons jsonb not null default '[]'::jsonb, approved_by uuid, approved_at timestamptz, active boolean not null default true, unique(tenant_id,module_id,user_id)
);
create table if not exists public.teaching_assignments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid not null references public.modules(id) on delete cascade, lecturer_id uuid not null,
 cohort_reference text, starts_at timestamptz not null, ends_at timestamptz not null, delivery_mode text not null default 'online', room_or_link text,
 assignment_source text not null default 'manual' check(assignment_source in ('manual','ai_suggested','ai_approved')), approved_by uuid, status text not null default 'draft' check(status in ('draft','proposed','confirmed','cancelled','completed')), created_at timestamptz not null default now()
);
create table if not exists public.safeguarding_communication_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, staff_user_id uuid not null, student_user_id uuid not null,
 channel text not null, permitted boolean not null, reason text, occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
alter table public.staff_candidates enable row level security; alter table public.staff_verifications enable row level security; alter table public.staff_competencies enable row level security;
alter table public.staff_availability enable row level security; alter table public.module_staff_eligibility enable row level security; alter table public.teaching_assignments enable row level security; alter table public.safeguarding_communication_events enable row level security;
create policy "staff candidates managers" on public.staff_candidates for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "staff verification managers" on public.staff_verifications for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "competency academic managers" on public.staff_competencies for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'programme_leader'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "availability own read" on public.staff_availability for select to authenticated using(public.same_tenant(tenant_id) and (user_id=auth.uid() or public.is_academic_manager()));
create policy "availability own manage" on public.staff_availability for all to authenticated using(public.same_tenant(tenant_id) and user_id=auth.uid()) with check(public.same_tenant(tenant_id) and user_id=auth.uid());
create policy "eligibility academic read" on public.module_staff_eligibility for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "eligibility academic manage" on public.module_staff_eligibility for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "teaching assignments scoped read" on public.teaching_assignments for select to authenticated using(public.same_tenant(tenant_id) and (lecturer_id=auth.uid() or public.is_academic_manager()));
create policy "teaching assignments academic manage" on public.teaching_assignments for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "safeguarding managers read" on public.safeguarding_communication_events for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
