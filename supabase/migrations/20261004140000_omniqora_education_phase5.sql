-- Omniqora Education phase 5: authoritative workflow event wiring.
do $$ begin
 if to_regclass('public.submissions') is not null then
  execute 'drop trigger if exists omni_submission on public.submissions';
  execute 'create trigger omni_submission after insert on public.submissions for each row execute function public.queue_omniqora_event(''assignment.submitted'')';
 end if;
 if to_regclass('public.attendance_records') is not null then
  execute 'drop trigger if exists omni_attendance on public.attendance_records';
  execute 'create trigger omni_attendance after insert on public.attendance_records for each row execute function public.queue_omniqora_event(''attendance.recorded'')';
 end if;
end $$;

create table if not exists public.omniqora_executive_snapshots (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, snapshot_date date not null default current_date,
 learners integer not null default 0, active_courses integer not null default 0, attendance_rate numeric, engagement_score numeric,
 completion_rate numeric, high_attention integer not null default 0, open_interventions integer not null default 0,
 placements_completed integer not null default 0, labs_completed integer not null default 0,
 quality_signals jsonb not null default '{}'::jsonb, financial_signals jsonb not null default '{}'::jsonb,
 progression_signals jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(tenant_id,snapshot_date)
);
alter table public.omniqora_executive_snapshots enable row level security;
create policy "executive intelligence leadership" on public.omniqora_executive_snapshots for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
