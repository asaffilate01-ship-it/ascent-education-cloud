-- Physical centre access, occupancy, visitor/student passes and security incidents.
create table if not exists public.access_points (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, zone text not null default 'main',
 direction_mode text not null default 'both' check(direction_mode in ('entry','exit','both')), device_reference text, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.access_credentials (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, holder_user_id uuid, holder_type text not null check(holder_type in ('staff','student','visitor','contractor')),
 credential_type text not null check(credential_type in ('staff_card','student_pass','visitor_pass','temporary_pass')),
 credential_number text not null, valid_from timestamptz not null default now(), valid_until timestamptz, active boolean not null default true,
 issued_by uuid, returned_at timestamptz, notes text, unique(tenant_id,credential_number)
);
create table if not exists public.access_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, access_point_id uuid references public.access_points(id),
 credential_id uuid references public.access_credentials(id), holder_user_id uuid, direction text not null check(direction in ('in','out','denied')),
 occurred_at timestamptz not null default now(), device_reference text, reason text, created_at timestamptz not null default now()
);
create table if not exists public.visitor_register (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, full_name text not null, id_type text not null, id_reference_masked text,
 host_user_id uuid, purpose text, pass_credential_id uuid references public.access_credentials(id), checked_in_at timestamptz, checked_out_at timestamptz,
 id_checked_by uuid, pass_returned boolean not null default false, notes text, created_at timestamptz not null default now()
);
create table if not exists public.student_arrival_registrations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, student_number text not null, identity_type text not null default 'CNIC',
 identity_checked boolean not null default false, kyc_case_id uuid references public.student_kyc_cases(id), pass_credential_id uuid references public.access_credentials(id),
 residential_week_id uuid, arrived_at timestamptz not null default now(), departed_at timestamptz, registered_by uuid
);
create table if not exists public.security_incidents (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, access_point_id uuid references public.access_points(id), reported_by uuid,
 severity text not null default 'low' check(severity in ('low','medium','high','critical')), incident_type text not null, description text not null,
 cctv_reference text, occurred_at timestamptz not null default now(), status text not null default 'open' check(status in ('open','investigating','resolved','closed')),
 resolved_by uuid, resolved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.emergency_muster_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, started_by uuid, started_at timestamptz not null default now(), ended_at timestamptz,
 status text not null default 'active' check(status in ('active','closed')), notes text
);
create index if not exists idx_access_events_tenant_time on public.access_events(tenant_id,occurred_at desc);
create index if not exists idx_access_events_holder on public.access_events(holder_user_id,occurred_at desc);
alter table public.access_points enable row level security; alter table public.access_credentials enable row level security; alter table public.access_events enable row level security;
alter table public.visitor_register enable row level security; alter table public.student_arrival_registrations enable row level security; alter table public.security_incidents enable row level security; alter table public.emergency_muster_events enable row level security;

-- Centre directors/superadmins manage configuration; welfare can read occupancy; users can read own events.
create policy "access points tenant read" on public.access_points for select to authenticated using(public.same_tenant(tenant_id));
create policy "access points director manage" on public.access_points for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "credentials own or authorised read" on public.access_credentials for select to authenticated using(public.same_tenant(tenant_id) and (holder_user_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "access events own or authorised read" on public.access_events for select to authenticated using(public.same_tenant(tenant_id) and (holder_user_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "visitor authorised read" on public.visitor_register for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "arrival authorised read" on public.student_arrival_registrations for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "security incidents authorised read" on public.security_incidents for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "muster authorised read" on public.emergency_muster_events for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'welfare_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));

create or replace view public.current_centre_occupancy as
select distinct on (tenant_id,coalesce(holder_user_id,credential_id))
 tenant_id,coalesce(holder_user_id,credential_id) as person_key,holder_user_id,credential_id,direction,occurred_at,access_point_id
from public.access_events order by tenant_id,coalesce(holder_user_id,credential_id),occurred_at desc;
