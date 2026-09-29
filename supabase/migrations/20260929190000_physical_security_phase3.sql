-- Physical security phase 3: credential issuance, access zones, incidents and hardware abstraction.
create table if not exists public.centre_access_zone_permissions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, credential_id uuid not null references public.centre_access_credentials(id) on delete cascade,
 zone_id uuid not null references public.centre_security_zones(id) on delete cascade, valid_from timestamptz not null default now(), valid_until timestamptz,
 granted_by uuid not null, status text not null default 'active', unique(credential_id,zone_id)
);
create table if not exists public.security_devices (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, device_type text not null check(device_type in ('door_controller','turnstile','card_reader','qr_reader','nfc_reader','panic_button','fire_panel','nvr','vms')),
 device_code text not null, zone_id uuid references public.centre_security_zones(id), endpoint_reference text, status text not null default 'offline',
 last_health_at timestamptz, metadata jsonb not null default '{}'::jsonb, unique(tenant_id,device_code)
);
create table if not exists public.security_incidents (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, incident_type text not null, severity text not null default 'medium',
 zone_id uuid references public.centre_security_zones(id), access_event_id uuid references public.centre_access_events(id), camera_ids uuid[] not null default '{}',
 occurred_at timestamptz not null default now(), reported_by uuid, status text not null default 'open', description text, resolution text, closed_at timestamptz, closed_by uuid
);
alter table public.centre_access_zone_permissions enable row level security; alter table public.security_devices enable row level security; alter table public.security_incidents enable row level security;
create policy "zone permissions privileged read" on public.centre_access_zone_permissions for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "security devices privileged read" on public.security_devices for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "security incidents privileged read" on public.security_incidents for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
