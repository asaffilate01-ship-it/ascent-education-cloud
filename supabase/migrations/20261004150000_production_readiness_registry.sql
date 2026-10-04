-- Production readiness: integration registry and operational health.
create table if not exists public.production_integrations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integration_key text not null,
 category text not null, required_for_launch boolean not null default false, status text not null default 'not_configured'
 check(status in ('not_configured','credentials_required','configured','testing','healthy','degraded','failed','not_applicable')),
 last_health_at timestamptz, last_error text, metadata jsonb not null default '{}'::jsonb, unique(tenant_id,integration_key)
);
create table if not exists public.production_readiness_checks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, check_key text not null, category text not null,
 status text not null default 'pending' check(status in ('pending','pass','fail','blocked','not_applicable')),
 evidence_reference text, checked_at timestamptz, checked_by uuid, notes text, unique(tenant_id,check_key)
);
alter table public.production_integrations enable row level security; alter table public.production_readiness_checks enable row level security;
create policy "integration leadership read" on public.production_integrations for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "readiness leadership read" on public.production_readiness_checks for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
