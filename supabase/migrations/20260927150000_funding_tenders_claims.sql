-- Funding/tender CRM and funded cohort evidence/claims.
create table if not exists public.funding_organisations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, funder_type text not null check(funder_type in ('federal','provincial','donor','ngo','employer','foundation','other')),
 country text not null default 'Pakistan', website text, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.funding_opportunities (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, funder_id uuid not null references public.funding_organisations(id),
 title text not null, reference text, funding_model text not null check(funding_model in ('grant','tender','outcome_based','cost_share','voucher','scholarship','employer_paid','other')),
 province text, districts text[], eligible_trades text[], target_groups jsonb not null default '{}'::jsonb, opens_at timestamptz, closes_at timestamptz,
 source_url text, status text not null default 'watching' check(status in ('watching','qualifying','bid_preparation','submitted','awarded','unsuccessful','closed')),
 estimated_value_pkr numeric, owner_id uuid, notes text, created_at timestamptz not null default now()
);
create table if not exists public.funding_bids (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, opportunity_id uuid not null references public.funding_opportunities(id) on delete cascade,
 bid_status text not null default 'draft', submission_reference text, submitted_at timestamptz, requested_value_pkr numeric, awarded_value_pkr numeric,
 evidence_checklist jsonb not null default '[]'::jsonb, risks jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.funded_cohorts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, bid_id uuid references public.funding_bids(id), course_id uuid not null references public.course_catalogue(id),
 cohort_reference text not null, funding_type text not null check(funding_type in ('fully_funded','part_funded','employer_funded','student_paid','mixed')),
 sponsor_contribution_pkr numeric not null default 0, student_contribution_pkr numeric not null default 0, target_students integer, city text, starts_on date, ends_on date,
 outcome_rules jsonb not null default '{}'::jsonb, status text not null default 'planned'
);
create table if not exists public.funded_learner_evidence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, funded_cohort_id uuid not null references public.funded_cohorts(id) on delete cascade, student_id uuid not null,
 eligibility_verified boolean not null default false, identity_verified boolean not null default false, attendance_pct numeric, practical_hours numeric,
 assessment_status text, completion_status text, employment_status text, employer_reference text, evidence jsonb not null default '{}'::jsonb,
 unique(funded_cohort_id,student_id)
);
create table if not exists public.funding_claims (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, funded_cohort_id uuid not null references public.funded_cohorts(id), claim_type text not null,
 amount_pkr numeric not null, qualifying_event text, evidence_pack_reference text, status text not null default 'draft' check(status in ('draft','submitted','queried','approved','paid','rejected')),
 submitted_at timestamptz, paid_at timestamptz, created_at timestamptz not null default now()
);
alter table public.funding_organisations enable row level security; alter table public.funding_opportunities enable row level security; alter table public.funding_bids enable row level security;
alter table public.funded_cohorts enable row level security; alter table public.funded_learner_evidence enable row level security; alter table public.funding_claims enable row level security;
create policy "funding staff manage orgs" on public.funding_organisations for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "funding staff manage opportunities" on public.funding_opportunities for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "funding staff manage bids" on public.funding_bids for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "funded cohorts student read" on public.funded_cohorts for select to authenticated using(public.same_tenant(tenant_id));
create policy "funded evidence own read" on public.funded_learner_evidence for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "funding claims finance read" on public.funding_claims for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
