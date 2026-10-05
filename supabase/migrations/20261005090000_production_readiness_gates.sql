-- Production readiness gates: evidence-based readiness, never self-declared 100%.
create table if not exists public.production_readiness_gates (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, gate_key text not null, category text not null,
 title text not null, required boolean not null default true, status text not null default 'pending'
 check(status in ('pending','in_progress','blocked','passed','waived')),
 evidence_reference text, verified_by uuid, verified_at timestamptz, notes text, updated_at timestamptz not null default now(),
 unique(tenant_id,gate_key)
);
alter table public.production_readiness_gates enable row level security;
create policy "readiness leadership read" on public.production_readiness_gates for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "readiness superadmin manage" on public.production_readiness_gates for all to authenticated using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'superadmin'::app_role)) with check(public.same_tenant(tenant_id));
