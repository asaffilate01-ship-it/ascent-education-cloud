-- Residential phase 2: trips, cultural/social programme, consent, transport and attendance.
create table if not exists public.residential_excursions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, residential_week_id uuid not null references public.residential_weeks(id) on delete cascade,
 title text not null, excursion_type text not null check(excursion_type in ('sightseeing','cultural','social','meal','museum','outdoor','optional_trip')),
 destination text not null, starts_at timestamptz not null, ends_at timestamptz not null, capacity integer,
 included_in_week boolean not null default true, optional_fee numeric, transport_plan text, staff_lead_id uuid,
 risk_assessment_reference text, emergency_notes text, status text not null default 'planned'
);
create table if not exists public.residential_excursion_participants (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, excursion_id uuid not null references public.residential_excursions(id) on delete cascade,
 student_id uuid not null, consent_required boolean not null default false, consent_status text not null default 'not_required',
 boarded_out_at timestamptz, arrived_at timestamptz, boarded_return_at timestamptz, returned_at timestamptz,
 status text not null default 'registered', notes text, unique(excursion_id,student_id)
);
alter table public.residential_excursions enable row level security; alter table public.residential_excursion_participants enable row level security;
create policy "excursions tenant read" on public.residential_excursions for select to authenticated using(public.same_tenant(tenant_id));
create policy "excursion participant own academic read" on public.residential_excursion_participants for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
