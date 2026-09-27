-- Careers marketplace: internships, jobs, international university progression and sponsorship connector.
create table if not exists public.career_organisations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, organisation_type text not null check(organisation_type in ('employer','recruiter','university','accommodation_partner','relocation_partner')),
 country text, city text, website text, verified boolean not null default false, partner_status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists public.career_opportunities (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, organisation_id uuid not null references public.career_organisations(id),
 opportunity_type text not null check(opportunity_type in ('internship','graduate_job','job','placement','apprenticeship')),
 title text not null, description text, country text not null, city text, remote boolean not null default false,
 sponsorship_available boolean not null default false, sponsorship_type text, salary_min numeric, salary_max numeric, currency text,
 requirements jsonb not null default '{}'::jsonb, closes_at timestamptz, status text not null default 'draft' check(status in ('draft','open','closed','filled','cancelled')), created_at timestamptz not null default now()
);
create table if not exists public.career_applications (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, opportunity_id uuid not null references public.career_opportunities(id), student_id uuid not null,
 cv_reference text, cover_letter_reference text, status text not null default 'submitted' check(status in ('draft','submitted','screening','shortlisted','interview','offer','rejected','withdrawn','hired')),
 consent_to_share boolean not null default false, submitted_at timestamptz, updated_at timestamptz not null default now(), unique(opportunity_id,student_id)
);
create table if not exists public.international_university_applications (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, university_organisation_id uuid not null references public.career_organisations(id),
 destination_country text not null, programme text not null, intake text, status text not null default 'planning',
 counsellor_id uuid, documents jsonb not null default '[]'::jsonb, offer_type text, offer_reference text, tuition_fee numeric, currency text,
 commission_expected numeric, commission_currency text, commission_status text not null default 'not_earned',
 accommodation_status text not null default 'not_started', predeparture_status text not null default 'not_started', arrival_support_status text not null default 'not_started',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.international_support_tasks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, application_id uuid not null references public.international_university_applications(id) on delete cascade,
 task_type text not null, title text not null, owner_id uuid, due_at timestamptz, status text not null default 'pending', notes text, created_at timestamptz not null default now()
);
create table if not exists public.sponsorship_checks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, opportunity_id uuid references public.career_opportunities(id), organisation_id uuid references public.career_organisations(id),
 provider text not null default 'sponsor_saas', external_reference text, country text not null, status text not null default 'pending',
 sponsorship_data jsonb not null default '{}'::jsonb, checked_at timestamptz, created_at timestamptz not null default now()
);
alter table public.career_organisations enable row level security; alter table public.career_opportunities enable row level security; alter table public.career_applications enable row level security;
alter table public.international_university_applications enable row level security; alter table public.international_support_tasks enable row level security; alter table public.sponsorship_checks enable row level security;
create policy "career org tenant read" on public.career_organisations for select to authenticated using(public.same_tenant(tenant_id));
create policy "opportunities tenant read" on public.career_opportunities for select to authenticated using(public.same_tenant(tenant_id) and status='open');
create policy "career applications own read" on public.career_applications for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "career applications student create" on public.career_applications for insert to authenticated with check(public.same_tenant(tenant_id) and student_id=auth.uid() and consent_to_share=true);
create policy "international applications own read" on public.international_university_applications for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "international support own read" on public.international_support_tasks for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.international_university_applications a where a.id=application_id and (a.student_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))));
create policy "sponsorship staff read" on public.sponsorship_checks for select to authenticated using(public.same_tenant(tenant_id));
