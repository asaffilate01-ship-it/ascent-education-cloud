-- Scholarships, sponsor-funded places, partner ecosystem and learner funding applications.
create table if not exists public.partner_directory (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null,
 partner_size text not null default 'sme' check(partner_size in ('micro','small','medium','large','enterprise')),
 partner_type text not null check(partner_type in ('employer','training_partner','practical_site','sponsor','recruiter','university','ngo','government','industry_body')),
 sector text, country text not null default 'Pakistan', province text, city text, website text, contact_reference text,
 capabilities jsonb not null default '{}'::jsonb, verification_status text not null default 'prospect' check(verification_status in ('prospect','due_diligence','verified','suspended','rejected')),
 agreement_status text not null default 'none', active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.scholarship_funds (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null,
 sponsor_type text not null check(sponsor_type in ('unipathway','employer','donor','ngo','government','alumni','mixed')),
 annual_budget_pkr numeric not null default 0, committed_pkr numeric not null default 0, criteria jsonb not null default '{}'::jsonb,
 starts_on date, ends_on date, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.student_funding_applications (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, funding_opportunity_id uuid references public.funding_opportunities(id),
 scholarship_fund_id uuid references public.scholarship_funds(id), course_id uuid references public.course_catalogue(id),
 status text not null default 'draft' check(status in ('draft','submitted','eligibility_review','documents_required','verified','approved','waitlisted','rejected','withdrawn')),
 requested_amount_pkr numeric, approved_amount_pkr numeric, eligibility_answers jsonb not null default '{}'::jsonb, required_documents jsonb not null default '[]'::jsonb,
 declaration_accepted boolean not null default false, reviewed_by uuid, reviewed_at timestamptz, decision_reason text, created_at timestamptz not null default now()
);
create table if not exists public.partner_engagements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, partner_id uuid not null references public.partner_directory(id) on delete cascade,
 engagement_type text not null check(engagement_type in ('internships','jobs','practical_training','corporate_training','sponsorship','scholarship','competition','guest_lecture','equipment','venue','research','other')),
 status text not null default 'prospecting', owner_id uuid, opportunity_value_pkr numeric, target_students integer, next_action text, next_action_at timestamptz, notes text, created_at timestamptz not null default now()
);
create table if not exists public.training_partner_requirements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, partner_id uuid not null references public.partner_directory(id), course_id uuid references public.course_catalogue(id),
 requirement_type text not null, status text not null default 'required', evidence_reference text, expires_at timestamptz, verified_by uuid, verified_at timestamptz
);
alter table public.partner_directory enable row level security; alter table public.scholarship_funds enable row level security; alter table public.student_funding_applications enable row level security;
alter table public.partner_engagements enable row level security; alter table public.training_partner_requirements enable row level security;
create policy "partner directory tenant read" on public.partner_directory for select to authenticated using(public.same_tenant(tenant_id));
create policy "partner directory managers" on public.partner_directory for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "scholarship funds managers" on public.scholarship_funds for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "funding applications own read" on public.student_funding_applications for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "funding applications own create" on public.student_funding_applications for insert to authenticated with check(public.same_tenant(tenant_id) and student_id=auth.uid());
create policy "partner engagements managers" on public.partner_engagements for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
