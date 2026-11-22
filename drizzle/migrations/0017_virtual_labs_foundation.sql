CREATE OR REPLACE FUNCTION public.is_academic_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (
  public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role))
$$;
REVOKE ALL ON FUNCTION public.is_academic_manager() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_academic_manager() TO authenticated;

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

-- Legacy lab_sessions (empty) gains the per-student lab session model additively.
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.lab_templates(id);
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS student_id uuid;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS cohort_reference text;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS provider_session_id text;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS workspace_reference text;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS minutes_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.lab_sessions ADD COLUMN IF NOT EXISTS attempt_no integer NOT NULL DEFAULT 1;
ALTER TABLE public.lab_sessions ALTER COLUMN title SET DEFAULT 'Practical lab';
CREATE OR REPLACE FUNCTION public.fill_legacy_lab_session_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.lecturer_id IS NULL THEN
  SELECT m.lecturer_id INTO NEW.lecturer_id FROM public.lab_templates t JOIN public.modules m ON m.id=t.module_id WHERE t.id=NEW.template_id;
  NEW.lecturer_id:=coalesce(NEW.lecturer_id,NEW.student_id,auth.uid());
 END IF;
 IF NEW.module_id IS NULL AND NEW.template_id IS NOT NULL THEN
  SELECT t.module_id INTO NEW.module_id FROM public.lab_templates t WHERE t.id=NEW.template_id;
 END IF;
 IF NEW.title IS NULL OR NEW.title='Practical lab' THEN
  SELECT coalesce(t.title,'Practical lab') INTO NEW.title FROM public.lab_templates t WHERE t.id=NEW.template_id;
  NEW.title:=coalesce(NEW.title,'Practical lab');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fill_legacy_lab_session_fields ON public.lab_sessions;
CREATE TRIGGER fill_legacy_lab_session_fields BEFORE INSERT ON public.lab_sessions
 FOR EACH ROW EXECUTE FUNCTION public.fill_legacy_lab_session_fields();

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

GRANT SELECT ON public.lab_templates,public.lab_tasks,public.lab_task_progress,public.lab_help_requests,public.lab_instructor_access,public.lab_class_runs,public.lab_evidence TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lab_provider_configs TO authenticated;
GRANT ALL ON public.lab_templates,public.lab_tasks,public.lab_task_progress,public.lab_help_requests,public.lab_instructor_access,public.lab_provider_configs,public.lab_class_runs,public.lab_evidence TO service_role;

alter table public.lab_templates enable row level security; alter table public.lab_tasks enable row level security; alter table public.lab_task_progress enable row level security; alter table public.lab_help_requests enable row level security; alter table public.lab_instructor_access enable row level security;
alter table public.lab_provider_configs enable row level security; alter table public.lab_class_runs enable row level security; alter table public.lab_evidence enable row level security;
create policy "lab templates tenant read" on public.lab_templates for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab tasks tenant read" on public.lab_tasks for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab session own academic read" on public.lab_sessions for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role)));
create policy "lab progress own academic read" on public.lab_task_progress for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.lab_sessions s where s.id=session_id and (s.student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role))));
create policy "lab help own academic read" on public.lab_help_requests for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role)));
create policy "lab instructor audit privileged read" on public.lab_instructor_access for select to authenticated using(public.same_tenant(tenant_id) and (instructor_id=auth.uid() or public.is_academic_manager()));
revoke update, delete on public.lab_instructor_access from authenticated;
create policy "lab provider admin" on public.lab_provider_configs for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "lab class tenant read" on public.lab_class_runs for select to authenticated using(public.same_tenant(tenant_id));
create policy "lab evidence own academic read" on public.lab_evidence for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.lab_sessions s where s.id=session_id and (s.student_id=auth.uid() or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role))));