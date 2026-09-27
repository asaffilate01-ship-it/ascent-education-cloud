-- Years 9-12 tutoring/coaching academy within the LMS.
create table if not exists public.school_tuition_tracks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, title text not null,
 curriculum_route text not null check(curriculum_route in ('FBISE','Punjab_BISE','Sindh_BISE','KPK_BISE','Balochistan_BISE','Cambridge_OL','Cambridge_AL','Other')),
 grade integer not null check(grade between 9 and 12), stream text, city text, delivery_modes text[] not null default array['online']::text[],
 active boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.school_tuition_subjects (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, track_id uuid not null references public.school_tuition_tracks(id) on delete cascade,
 subject text not null, syllabus_version text, exam_board text, practical_required boolean not null default false, active boolean not null default true,
 unique(track_id,subject)
);
create table if not exists public.tuition_enrolments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, track_id uuid not null references public.school_tuition_tracks(id),
 subject_ids uuid[] not null default '{}', package_type text not null default 'subject', fee_pkr numeric, status text not null default 'active',
 guardian_user_id uuid, starts_on date, ends_on date, created_at timestamptz not null default now()
);
create table if not exists public.tuition_mock_exams (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, subject_id uuid not null references public.school_tuition_subjects(id), title text not null,
 scheduled_at timestamptz, duration_minutes integer, total_marks numeric, delivery_mode text not null default 'online', status text not null default 'draft'
);
alter table public.school_tuition_tracks enable row level security; alter table public.school_tuition_subjects enable row level security; alter table public.tuition_enrolments enable row level security; alter table public.tuition_mock_exams enable row level security;
create policy "tuition tracks published read" on public.school_tuition_tracks for select to authenticated using(public.same_tenant(tenant_id) and (active=true or public.is_academic_manager()));
create policy "tuition tracks academic manage" on public.school_tuition_tracks for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "tuition subjects read" on public.school_tuition_subjects for select to authenticated using(public.same_tenant(tenant_id));
create policy "tuition subjects academic manage" on public.school_tuition_subjects for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "tuition enrolments own read" on public.tuition_enrolments for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or guardian_user_id=auth.uid() or public.is_academic_manager()));
create policy "tuition mocks read" on public.tuition_mock_exams for select to authenticated using(public.same_tenant(tenant_id));
