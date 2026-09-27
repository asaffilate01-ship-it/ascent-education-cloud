-- Academic hierarchy and student-life / competitions.
create table if not exists public.schools (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, code text not null, description text, head_user_id uuid, active boolean not null default true, unique(tenant_id,code)
);
create table if not exists public.school_departments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, school_id uuid not null references public.schools(id) on delete cascade,
 name text not null, code text not null, head_user_id uuid, active boolean not null default true, unique(school_id,code)
);
alter table public.programmes add column if not exists school_id uuid references public.schools(id);
alter table public.programmes add column if not exists department_id uuid references public.school_departments(id);
alter table public.programmes add column if not exists academic_years integer;
create table if not exists public.student_academic_placements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, school_id uuid not null references public.schools(id),
 department_id uuid references public.school_departments(id), programme_id uuid not null references public.programmes(id), academic_year integer not null default 1,
 level text not null, cohort_reference text, status text not null default 'active', starts_on date, ends_on date, unique(student_id,programme_id,academic_year,level)
);
create table if not exists public.student_life_activities (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, school_id uuid references public.schools(id), department_id uuid references public.school_departments(id),
 name text not null, activity_type text not null check(activity_type in ('debate','technology','sports','chess','literature','arts','entrepreneurship','volunteering','academic','other')),
 description text, staff_lead_id uuid, capacity integer, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.activity_memberships (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, activity_id uuid not null references public.student_life_activities(id) on delete cascade,
 student_id uuid not null, role text not null default 'member', status text not null default 'active', joined_at timestamptz not null default now(), unique(activity_id,student_id)
);
create table if not exists public.competitions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, title text not null, competition_type text not null,
 scope text not null check(scope in ('intra_school','inter_school','inter_department','inter_centre','inter_university','external','sponsored')),
 host_name text, venue text, starts_at timestamptz, ends_at timestamptz, registration_deadline timestamptz, sponsor_name text, sponsor_value numeric,
 status text not null default 'draft' check(status in ('draft','open','confirmed','completed','cancelled')), rules text, created_at timestamptz not null default now()
);
create table if not exists public.competition_entries (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, competition_id uuid not null references public.competitions(id) on delete cascade,
 activity_id uuid references public.student_life_activities(id), school_id uuid references public.schools(id), department_id uuid references public.school_departments(id),
 team_name text, entry_type text not null default 'team' check(entry_type in ('individual','team')), status text not null default 'registered', result text, placing integer
);
create table if not exists public.competition_participants (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, entry_id uuid not null references public.competition_entries(id) on delete cascade,
 student_id uuid not null, role text not null default 'participant', unique(entry_id,student_id)
);
alter table public.schools enable row level security; alter table public.school_departments enable row level security; alter table public.student_academic_placements enable row level security;
alter table public.student_life_activities enable row level security; alter table public.activity_memberships enable row level security; alter table public.competitions enable row level security;
alter table public.competition_entries enable row level security; alter table public.competition_participants enable row level security;
create policy "schools tenant read" on public.schools for select to authenticated using(public.same_tenant(tenant_id));
create policy "schools director manage" on public.schools for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "departments tenant read" on public.school_departments for select to authenticated using(public.same_tenant(tenant_id));
create policy "departments director manage" on public.school_departments for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "placements student or staff read" on public.student_academic_placements for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "placements academic manage" on public.student_academic_placements for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "activities tenant read" on public.student_life_activities for select to authenticated using(public.same_tenant(tenant_id));
create policy "activities staff manage" on public.student_life_activities for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "memberships own read" on public.activity_memberships for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "competitions tenant read" on public.competitions for select to authenticated using(public.same_tenant(tenant_id));
create policy "competitions staff manage" on public.competitions for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
