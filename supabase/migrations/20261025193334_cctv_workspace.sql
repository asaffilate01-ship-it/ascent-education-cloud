-- Provider credentials and stream URLs never belong in camera metadata.
create table public.cctv_cameras (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null check(length(name) between 1 and 100), location text not null check(length(location) between 1 and 160),
 provider_camera_id text not null check(length(provider_camera_id) between 1 and 200),
 enabled boolean not null default false, security_live boolean not null default false, security_playback boolean not null default false,
 created_at timestamptz not null default now(), unique(tenant_id,provider_camera_id)
);
create table public.cctv_access_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), camera_id uuid not null references public.cctv_cameras(id),
 user_id uuid not null, mode text not null check(mode in ('live','playback')), reason text,
 starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now()
);
alter table public.cctv_cameras enable row level security;
alter table public.cctv_access_events enable row level security;
create policy "cctv authorised inventory" on public.cctv_cameras for select to authenticated using (
 public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'superadmin') or public.has_role(auth.uid(),'centre_director') or (public.has_role(auth.uid(),'security_officer') and enabled and (security_live or security_playback)))
);
create policy "cctv centre managers" on public.cctv_cameras for all to authenticated using (
 public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'superadmin') or public.has_role(auth.uid(),'centre_director'))
) with check (public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'superadmin') or public.has_role(auth.uid(),'centre_director')));
create policy "cctv audit managers" on public.cctv_access_events for select to authenticated using (
 public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'superadmin') or public.has_role(auth.uid(),'centre_director'))
);
grant select,insert,update,delete on public.cctv_cameras to authenticated;
grant select on public.cctv_access_events to authenticated;
revoke insert,update,delete on public.cctv_access_events from authenticated,anon;
grant all on public.cctv_cameras,public.cctv_access_events to service_role;
