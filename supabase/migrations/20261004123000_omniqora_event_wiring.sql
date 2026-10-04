-- Omniqora Education phase 3: source wiring/outbox and cohort intelligence.
create table if not exists public.omniqora_event_outbox (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, event_type text not null, source_table text not null,
 source_id uuid not null, student_id uuid, entity_type text, payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','processing','exported','failed')),
 attempts integer not null default 0, last_error text, created_at timestamptz not null default now(), exported_at timestamptz,
 unique(tenant_id,event_type,source_table,source_id)
);
create table if not exists public.omniqora_cohort_intelligence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid, cohort_reference text not null,
 learner_count integer not null default 0, attendance_rate numeric, engagement_score numeric, completion_rate numeric,
 resubmission_rate numeric, lab_completion_rate numeric, placement_completion_rate numeric, high_attention_count integer not null default 0,
 weak_criteria jsonb not null default '[]'::jsonb, recommended_interventions jsonb not null default '[]'::jsonb,
 calculated_at timestamptz not null default now(), unique(tenant_id,course_id,cohort_reference)
);
alter table public.omniqora_event_outbox enable row level security; alter table public.omniqora_cohort_intelligence enable row level security;
create policy "outbox privileged read" on public.omniqora_event_outbox for select to authenticated using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'superadmin'::app_role));
create policy "cohort academic read" on public.omniqora_cohort_intelligence for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());

create or replace function public.queue_omniqora_event() returns trigger language plpgsql security definer set search_path=public as $$
declare et text; sid uuid; payload jsonb;
begin
 et:=TG_ARGV[0]; sid:=case when to_jsonb(new)?'student_id' then (to_jsonb(new)->>'student_id')::uuid when to_jsonb(new)?'user_id' then (to_jsonb(new)->>'user_id')::uuid else null end;
 payload:=jsonb_build_object('status',to_jsonb(new)->>'status','source',TG_TABLE_NAME);
 insert into public.omniqora_event_outbox(tenant_id,event_type,source_table,source_id,student_id,entity_type,payload)
 values(new.tenant_id,et,TG_TABLE_NAME,new.id,sid,TG_TABLE_NAME,payload) on conflict do nothing;
 return new;
end $$;

do $$ begin
 if to_regclass('public.lab_sessions') is not null then
  execute 'drop trigger if exists omni_lab_completed on public.lab_sessions';
  execute 'create trigger omni_lab_completed after insert or update of status on public.lab_sessions for each row when (new.status=''completed'') execute function public.queue_omniqora_event(''lab.completed'')';
 end if;
 if to_regclass('public.residential_work_placements') is not null then
  execute 'drop trigger if exists omni_placement on public.residential_work_placements';
  execute 'create trigger omni_placement after insert or update of status on public.residential_work_placements for each row when (new.status=''completed'') execute function public.queue_omniqora_event(''placement.completed'')';
 end if;
end $$;
