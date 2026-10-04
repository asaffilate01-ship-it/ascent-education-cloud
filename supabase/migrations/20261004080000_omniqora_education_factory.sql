-- Omniqora Education Factory registration, event stream and intelligence layer.
create table if not exists public.omniqora_product_registration (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, product_key text not null default 'unipathway',
 factory_tenant_reference text, environment text not null default 'production', status text not null default 'local_only',
 capabilities jsonb not null default '{}'::jsonb, registered_at timestamptz, last_sync_at timestamptz, unique(tenant_id,product_key,environment)
);
create table if not exists public.omniqora_education_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid, actor_id uuid, event_type text not null,
 entity_type text, entity_id uuid, occurred_at timestamptz not null default now(), source text not null default 'unipathway',
 payload jsonb not null default '{}'::jsonb, correlation_id uuid, exported_at timestamptz
);
create table if not exists public.omniqora_student_intelligence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null,
 risk_score numeric not null default 0, engagement_score numeric, attendance_score numeric, assessment_score numeric, lab_score numeric,
 tuition_score numeric, career_readiness_score numeric, factors jsonb not null default '[]'::jsonb, recommendations jsonb not null default '[]'::jsonb,
 model_version text, calculated_at timestamptz not null default now(), human_review_status text not null default 'not_required',
 unique(tenant_id,student_id)
);
create table if not exists public.omniqora_course_intelligence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null,
 cohort_reference text, completion_rate numeric, resubmission_rate numeric, attendance_rate numeric, average_engagement numeric,
 weak_criteria jsonb not null default '[]'::jsonb, interventions jsonb not null default '[]'::jsonb, calculated_at timestamptz not null default now()
);
alter table public.omniqora_product_registration enable row level security; alter table public.omniqora_education_events enable row level security; alter table public.omniqora_student_intelligence enable row level security; alter table public.omniqora_course_intelligence enable row level security;
create policy "omni registration admin" on public.omniqora_product_registration for select to authenticated using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'superadmin'::app_role));
create policy "omni student own academic" on public.omniqora_student_intelligence for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "omni course academic" on public.omniqora_course_intelligence for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "omni events privileged" on public.omniqora_education_events for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'superadmin'::app_role)));
