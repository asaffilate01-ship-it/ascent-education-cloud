-- Regulatory approvals and PSDF readiness engine.
create table if not exists public.regulatory_requirements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, framework text not null check(framework in ('NAVTTC','NVQF','QAB','NAC_TVS','PSDF','OTHER')),
 requirement_code text not null, title text not null, category text not null, applies_to text not null default 'institute',
 source_url text, source_version text, mandatory boolean not null default true, evidence_types jsonb not null default '[]'::jsonb,
 active boolean not null default true, unique(tenant_id,framework,requirement_code,source_version)
);
create table if not exists public.approval_readiness (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, framework text not null, scope_type text not null, scope_reference text not null,
 requirement_id uuid not null references public.regulatory_requirements(id), status text not null default 'gap' check(status in ('gap','in_progress','ready','submitted','verified','not_applicable')),
 evidence_reference text, owner_id uuid, due_at timestamptz, reviewer_id uuid, reviewed_at timestamptz, notes text, unique(tenant_id,scope_type,scope_reference,requirement_id)
);
create table if not exists public.qab_course_matrix (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null references public.course_catalogue(id), qualification_code text,
 nvqf_level text, qab_name text, qab_region text, affiliation_status text not null default 'research', trainer_requirement text, practical_requirement text,
 assessment_centre text, assessor_requirement text, source_url text, verified_at timestamptz, unique(tenant_id,course_id,qab_name)
);
create table if not exists public.psdf_opportunity_matrix (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, funding_opportunity_id uuid not null references public.funding_opportunities(id) on delete cascade,
 trade_course_id uuid references public.course_catalogue(id), district text, provider_registration text, location_approval_required boolean,
 capacity_required integer, trainer_rules jsonb not null default '{}'::jsonb, equipment_rules jsonb not null default '{}'::jsonb,
 trainee_rules jsonb not null default '{}'::jsonb, employment_commitment_pct numeric, stipend_rules jsonb not null default '{}'::jsonb,
 claim_rules jsonb not null default '{}'::jsonb, readiness_score numeric not null default 0, blockers jsonb not null default '[]'::jsonb,
 source_url text, source_version text, last_reviewed_at timestamptz
);
alter table public.regulatory_requirements enable row level security; alter table public.approval_readiness enable row level security; alter table public.qab_course_matrix enable row level security; alter table public.psdf_opportunity_matrix enable row level security;
create policy "reg requirements staff read" on public.regulatory_requirements for select to authenticated using(public.same_tenant(tenant_id));
create policy "reg requirements managers" on public.regulatory_requirements for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "readiness managers" on public.approval_readiness for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "qab matrix academic read" on public.qab_course_matrix for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "qab matrix academic manage" on public.qab_course_matrix for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "psdf matrix managers" on public.psdf_opportunity_matrix for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
