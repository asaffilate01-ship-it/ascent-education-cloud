-- Interactive virtual labs: provider-neutral sessions, tasks, help queue and instructor observation.
create table if not exists public.lab_templates (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid references public.modules(id), title text not null,
 provider text not null check(provider in ('unipathway_container','github_codespaces','aws_academy','azure','jupyter','managed_lab')),
 environment_reference text, duration_minutes integer not null default 90, max_attempts integer not null default 2,
 instructor_observe boolean not null default true, instructor_assist boolean not null default true, active boolean not null default true
);
create table if not exists public.lab_tasks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, template_id uuid not null references public.lab_templates(id) on delete cascade,
 sequence_no integer not null, title text not null, instructions text, verification_type text not null default 'manual',
 verification_config jsonb not null default '{}'::jsonb, points numeric not null default 0, unique(template_id,sequence_no)
);
create table if not exists public.lab_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, template_id uuid not null references public.lab_templates(id),
 student_id uuid not null, cohort_reference text, provider_session_id text, workspace_reference text,
 status text not null default 'provisioning' check(status in ('provisioning','ready','active','paused','completed','failed','expired','terminated')),
 started_at timestamptz, last_activity_at timestamptz, ended_at timestamptz, minutes_used integer not null default 0,
 attempt_no integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.lab_task_progress (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.lab_sessions(id) on delete cascade,
 task_id uuid not null references public.lab_tasks(id), status text not null default 'not_started', attempts integer not null default 0,
 verification_result jsonb not null default '{}'::jsonb, completed_at timestamptz, unique(session_id,task_id)
);
create table if not exists public.lab_help_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.lab_sessions(id) on delete cascade,
 student_id uuid not null, message text, status text not null default 'waiting' check(status in ('waiting','claimed','assisting','resolved','cancelled')),
 priority text not null default 'normal', requested_at timestamptz not null default now(), claimed_by uuid, claimed_at timestamptz, resolved_at timestamptz
);
create table if not exists public.lab_instructor_access (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.lab_sessions(id) on delete cascade,
 instructor_id uuid not null, mode text not null check(mode in ('observe','assist','control')), reason text not null,
 started_at timestamptz not null default now(), ended_at timestamptz, metadata jsonb not null default '{}'::jsonb
);
alter table public.lab_templates enable row level security; alter table public.lab_tasks enable row level security; alter table public.lab_sessions enable row level security; alter table public.lab_task_progress enable row level security; alter table public.lab_help_requests enable row level security; alter table public.lab_instructor_access enable row level security;
create policy "lab templates tenant read" on public.lab_templates for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab tasks tenant read" on public.lab_tasks for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab session own academic read" on public.lab_sessions for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role)));
create policy "lab progress own academic read" on public.lab_task_progress for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.lab_sessions s where s.id=session_id and (s.student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role))));
create policy "lab help own academic read" on public.lab_help_requests for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role)));
create policy "lab instructor audit privileged read" on public.lab_instructor_access for select to authenticated using(public.same_tenant(tenant_id) and (instructor_id=auth.uid() or public.is_academic_manager()));
revoke update, delete on public.lab_instructor_access from authenticated;
