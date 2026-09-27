-- Enforce separation of teaching and specialist summative marking.
alter table public.assessor_decisions add column if not exists marker_specialism text;
alter table public.assessor_decisions add column if not exists second_read_required boolean not null default false;
alter table public.assessor_decisions add column if not exists consistency_flags jsonb not null default '[]'::jsonb;

create table if not exists public.marker_module_eligibility (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, marker_id uuid not null, module_id uuid not null references public.modules(id) on delete cascade,
 approved boolean not null default false, competency_score numeric, evidence jsonb not null default '{}'::jsonb, approved_by uuid, approved_at timestamptz,
 unique(tenant_id,marker_id,module_id)
);
create table if not exists public.marking_allocations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
 marker_id uuid not null, allocated_by uuid, allocation_source text not null default 'system' check(allocation_source in ('system','ai_suggested','manual')),
 due_at timestamptz, status text not null default 'allocated' check(status in ('allocated','opened','in_progress','submitted','reallocated','completed')),
 conflict_declared boolean not null default false, created_at timestamptz not null default now(), unique(submission_attempt_id,status)
);
alter table public.marker_module_eligibility enable row level security; alter table public.marking_allocations enable row level security;
create policy "marker eligibility academic manage" on public.marker_module_eligibility for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "marking allocations scoped read" on public.marking_allocations for select to authenticated using(public.same_tenant(tenant_id) and (marker_id=auth.uid() or public.is_academic_manager()));
create policy "marking allocations academic manage" on public.marking_allocations for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));

create or replace function public.marker_can_assess(_marker uuid,_attempt uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.marking_allocations ma
  where ma.marker_id=_marker and ma.submission_attempt_id=_attempt and ma.status in ('allocated','opened','in_progress')
 ) and exists(
  select 1 from public.marker_module_eligibility me
  join public.submission_attempts sa on sa.id=_attempt
  join public.submissions s on s.id=sa.submission_id
  join public.assignments a on a.id=s.assignment_id
  where me.marker_id=_marker and me.module_id=a.module_id and me.approved=true
 );
$$;
