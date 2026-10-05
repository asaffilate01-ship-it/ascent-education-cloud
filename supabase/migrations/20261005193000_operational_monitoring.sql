-- Monitoring, incident and operational health layer.
create table if not exists public.operational_incidents (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, severity text not null check(severity in ('critical','high','medium','low')),
 category text not null, title text not null, status text not null default 'open' check(status in ('open','contained','monitoring','resolved')),
 detected_at timestamptz not null default now(), contained_at timestamptz, resolved_at timestamptz, owner_id uuid,
 affected_services text[] not null default '{}', summary text, root_cause text, corrective_actions jsonb not null default '[]'::jsonb
);
create table if not exists public.operational_health_checks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, check_key text not null, service text not null,
 status text not null check(status in ('healthy','degraded','down','unknown')), latency_ms integer, checked_at timestamptz not null default now(),
 message text, metadata jsonb not null default '{}'::jsonb
);
alter table public.operational_incidents enable row level security; alter table public.operational_health_checks enable row level security;
create policy "incidents leadership" on public.operational_incidents for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "health leadership" on public.operational_health_checks for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
