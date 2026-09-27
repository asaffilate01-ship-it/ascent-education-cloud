-- LMS regional student-life hubs, local-to-national competitions and optional cost-sharing.
create table if not exists public.student_regions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null,
 country text not null default 'Pakistan', province text, city text not null, region_code text, source text not null default 'profile',
 active boolean not null default true, unique(tenant_id,student_id)
);
create table if not exists public.activity_hubs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, activity_id uuid not null references public.student_life_activities(id) on delete cascade,
 city text not null, province text, coordinator_user_id uuid, venue text, capacity integer, active boolean not null default true,
 unique(tenant_id,activity_id,city)
);
alter table public.competitions add column if not exists city text;
alter table public.competitions add column if not exists province text;
alter table public.competitions add column if not exists competition_stage text not null default 'local' check(competition_stage in ('local','city','regional','provincial','national','inter_university','external'));
alter table public.competitions add column if not exists parent_competition_id uuid references public.competitions(id);
alter table public.competitions add column if not exists participant_fee numeric not null default 0;
alter table public.competitions add column if not exists fee_currency text not null default 'PKR';
alter table public.competitions add column if not exists fee_notes text;
create table if not exists public.activity_fee_payments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, activity_id uuid references public.student_life_activities(id),
 competition_id uuid references public.competitions(id), amount numeric not null, currency text not null default 'PKR',
 status text not null default 'pending' check(status in ('pending','paid','waived','refunded','failed')), payment_reference text, paid_at timestamptz, created_at timestamptz not null default now()
);
alter table public.student_regions enable row level security; alter table public.activity_hubs enable row level security; alter table public.activity_fee_payments enable row level security;
create policy "student region own read" on public.student_regions for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "student region own manage" on public.student_regions for all to authenticated using(public.same_tenant(tenant_id) and student_id=auth.uid()) with check(public.same_tenant(tenant_id) and student_id=auth.uid());
create policy "activity hubs tenant read" on public.activity_hubs for select to authenticated using(public.same_tenant(tenant_id));
create policy "activity hubs staff manage" on public.activity_hubs for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "activity payments own read" on public.activity_fee_payments for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
