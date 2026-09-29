-- Centre physical access, occupancy and emergency muster.
create table if not exists public.centre_access_credentials (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, holder_user_id uuid, holder_type text not null check(holder_type in ('student','staff','contractor')),
 credential_type text not null check(credential_type in ('card','qr','nfc','mobile')), credential_reference_hash text not null,
 valid_from timestamptz not null default now(), valid_until timestamptz, status text not null default 'active' check(status in ('active','suspended','revoked','expired')),
 unique(tenant_id,credential_reference_hash)
);
create table if not exists public.centre_visitors (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, full_name text not null, id_type text, id_reference_masked text,
 host_user_id uuid, purpose text, pass_number text not null, checked_in_at timestamptz, checked_out_at timestamptz,
 status text not null default 'pre_registered' check(status in ('pre_registered','in_building','checked_out','denied')), created_at timestamptz not null default now()
);
create table if not exists public.centre_access_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, credential_id uuid references public.centre_access_credentials(id),
 visitor_id uuid references public.centre_visitors(id), gate_id text not null, direction text not null check(direction in ('in','out')),
 decision text not null check(decision in ('allowed','denied','manual_override')), reason text, occurred_at timestamptz not null default now(),
 security_user_id uuid, device_reference text, metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.centre_occupancy (
 tenant_id uuid not null, person_key text not null, person_type text not null, user_id uuid, visitor_id uuid,
 in_building boolean not null default false, last_event_at timestamptz, last_gate_id text, primary key(tenant_id,person_key)
);
alter table public.centre_access_credentials enable row level security; alter table public.centre_visitors enable row level security; alter table public.centre_access_events enable row level security; alter table public.centre_occupancy enable row level security;
create policy "access own security read" on public.centre_access_credentials for select to authenticated using(public.same_tenant(tenant_id) and (holder_user_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "visitor security read" on public.centre_visitors for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "events security read" on public.centre_access_events for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "occupancy security read" on public.centre_occupancy for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
