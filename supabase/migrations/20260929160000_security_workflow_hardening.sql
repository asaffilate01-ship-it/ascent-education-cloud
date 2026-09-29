-- Production security/workflow hardening: immutable decisions, controlled state transitions and privileged audit.
create table if not exists public.workflow_transition_log (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, workflow_type text not null, entity_id uuid not null,
 from_status text, to_status text not null, actor_id uuid not null, actor_role text, reason text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.security_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid, user_id uuid, event_type text not null,
 severity text not null default 'info' check(severity in ('info','warning','high','critical')), entity_type text, entity_id uuid,
 ip_address text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid
);
alter table public.workflow_transition_log enable row level security; alter table public.security_events enable row level security;
create policy "workflow log privileged read" on public.workflow_transition_log for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "security privileged read" on public.security_events for select to authenticated using((tenant_id is null or public.same_tenant(tenant_id)) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
revoke insert, update, delete on public.workflow_transition_log from authenticated;
revoke insert, update, delete on public.security_events from authenticated;
