-- Centre security phase 2: zones, muster, CCTV registry and controlled viewing.
create table if not exists public.centre_security_zones (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, risk_level text not null default 'standard',
 access_roles text[] not null default '{}', active boolean not null default true
);
create table if not exists public.cctv_cameras (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, zone_id uuid references public.centre_security_zones(id), camera_code text not null,
 display_name text not null, location_description text, nvr_channel text, stream_reference text, recording_enabled boolean not null default true,
 audio_enabled boolean not null default false, status text not null default 'offline', retention_days integer not null default 30,
 last_health_at timestamptz, unique(tenant_id,camera_code)
);
create table if not exists public.cctv_view_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, camera_id uuid not null references public.cctv_cameras(id),
 viewer_user_id uuid not null, purpose text not null, started_at timestamptz not null default now(), ended_at timestamptz,
 playback_from timestamptz, playback_to timestamptz, exported boolean not null default false, export_reason text
);
create table if not exists public.emergency_muster_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, event_type text not null, started_by uuid not null,
 started_at timestamptz not null default now(), ended_at timestamptz, status text not null default 'active'
);
create table if not exists public.emergency_muster_status (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, muster_event_id uuid not null references public.emergency_muster_events(id) on delete cascade,
 person_key text not null, person_type text not null, expected_inside boolean not null default true, status text not null default 'unaccounted',
 confirmed_by uuid, confirmed_at timestamptz, muster_point text, unique(muster_event_id,person_key)
);
alter table public.centre_security_zones enable row level security; alter table public.cctv_cameras enable row level security; alter table public.cctv_view_sessions enable row level security; alter table public.emergency_muster_events enable row level security; alter table public.emergency_muster_status enable row level security;
create policy "zones security read" on public.centre_security_zones for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "cameras security read" on public.cctv_cameras for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "cctv view own privileged read" on public.cctv_view_sessions for select to authenticated using(public.same_tenant(tenant_id) and (viewer_user_id=auth.uid() or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "muster security read" on public.emergency_muster_events for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "muster status security read" on public.emergency_muster_status for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
revoke update, delete on public.cctv_view_sessions from authenticated;
