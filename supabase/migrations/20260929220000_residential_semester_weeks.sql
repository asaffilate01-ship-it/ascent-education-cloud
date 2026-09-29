-- Two residential academic weeks per academic year: one per semester.
alter table public.residential_weeks add column if not exists semester integer check(semester in (1,2));
alter table public.residential_weeks add column if not exists week_type text not null default 'teaching_experience'
 check(week_type in ('teaching_experience','assessment_progression'));
alter table public.residential_weeks add column if not exists arrival_day text not null default 'Sunday afternoon';
alter table public.residential_weeks add column if not exists departure_day text not null default 'Sunday morning';
alter table public.residential_weeks add column if not exists exams_enabled boolean not null default false;

create table if not exists public.residential_week_activities (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, residential_week_id uuid not null references public.residential_weeks(id) on delete cascade,
 activity_type text not null check(activity_type in ('tuition','workshop','lab','tutorial','exam','revision','work_experience','university_expo','careers_fair','guidance','counselling','social','meal','trip','induction','checkout')),
 title text not null, starts_at timestamptz, ends_at timestamptz, room_or_location text, partner_id uuid,
 attendance_required boolean not null default true, capacity integer, metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.residential_work_placements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, residential_week_id uuid not null references public.residential_weeks(id) on delete cascade,
 student_id uuid not null, sector text not null, host_name text not null, host_location text, day_no integer,
 learning_objectives jsonb not null default '[]'::jsonb, supervisor_name text, status text not null default 'planned',
 attendance_verified boolean not null default false, feedback jsonb not null default '{}'::jsonb, reflection_reference text
);
alter table public.residential_week_activities enable row level security; alter table public.residential_work_placements enable row level security;
create policy "res activities tenant read" on public.residential_week_activities for select to authenticated using(public.same_tenant(tenant_id));
create policy "res placements own academic read" on public.residential_work_placements for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
