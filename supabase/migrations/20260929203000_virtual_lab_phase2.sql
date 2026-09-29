-- Virtual lab phase 2: provider connectors, class runs, TA assignment, evidence and cost controls.
create table if not exists public.lab_provider_configs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, provider text not null, display_name text not null,
 enabled boolean not null default false, credential_status text not null default 'required', capabilities jsonb not null default '{}'::jsonb,
 budget_monthly numeric, metadata jsonb not null default '{}'::jsonb, unique(tenant_id,provider)
);
create table if not exists public.lab_class_runs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, template_id uuid not null references public.lab_templates(id),
 cohort_reference text not null, live_class_session_id uuid references public.live_class_sessions(id), lead_instructor_id uuid not null,
 ta_user_ids uuid[] not null default '{}', starts_at timestamptz, ends_at timestamptz, max_concurrent integer not null default 50,
 status text not null default 'scheduled', created_at timestamptz not null default now()
);
alter table public.lab_sessions add column if not exists class_run_id uuid references public.lab_class_runs(id);
alter table public.lab_sessions add column if not exists estimated_cost numeric not null default 0;
alter table public.lab_sessions add column if not exists idle_shutdown_minutes integer not null default 20;
create table if not exists public.lab_evidence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.lab_sessions(id) on delete cascade,
 task_id uuid references public.lab_tasks(id), evidence_type text not null, evidence_reference text, verification jsonb not null default '{}'::jsonb,
 captured_at timestamptz not null default now(), signed_off_by uuid, signed_off_at timestamptz
);
alter table public.lab_provider_configs enable row level security; alter table public.lab_class_runs enable row level security; alter table public.lab_evidence enable row level security;
create policy "lab provider admin" on public.lab_provider_configs for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "lab class tenant read" on public.lab_class_runs for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab evidence own academic read" on public.lab_evidence for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.lab_sessions s where s.id=session_id and (s.student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role))));
