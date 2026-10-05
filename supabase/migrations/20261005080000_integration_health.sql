-- Phase 6: Factory connector configuration and integration health.
create table if not exists public.integration_health (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integration_key text not null,
 category text not null, status text not null default 'not_configured' check(status in ('not_configured','configured','degraded','healthy','error')),
 mode text, last_checked_at timestamptz, last_success_at timestamptz, message text, capabilities jsonb not null default '{}'::jsonb,
 unique(tenant_id,integration_key)
);
alter table public.integration_health enable row level security;
create policy "integration health leadership" on public.integration_health for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
