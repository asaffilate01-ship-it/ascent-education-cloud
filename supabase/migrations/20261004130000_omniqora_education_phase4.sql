-- Omniqora Education phase 4: Course, School and Department 360.
create table if not exists public.omniqora_organisation_intelligence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, scope_type text not null check(scope_type in ('school','department','institution')),
 scope_id uuid, scope_reference text, learner_count integer not null default 0, active_courses integer not null default 0,
 attendance_rate numeric, engagement_score numeric, completion_rate numeric, high_attention_count integer not null default 0,
 assessment_quality jsonb not null default '{}'::jsonb, capacity_signals jsonb not null default '{}'::jsonb,
 interventions jsonb not null default '[]'::jsonb, calculated_at timestamptz not null default now()
);
create table if not exists public.omniqora_course_criteria_intelligence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null, module_id uuid,
 criterion_reference text not null, attempts integer not null default 0, met_count integer not null default 0,
 resubmission_count integer not null default 0, iqa_flags integer not null default 0, ai_human_disagreement_count integer not null default 0,
 signals jsonb not null default '{}'::jsonb, calculated_at timestamptz not null default now(),
 unique(tenant_id,course_id,module_id,criterion_reference)
);
alter table public.omniqora_organisation_intelligence enable row level security; alter table public.omniqora_course_criteria_intelligence enable row level security;
create policy "org intelligence academic" on public.omniqora_organisation_intelligence for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "criteria intelligence academic" on public.omniqora_course_criteria_intelligence for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
