-- Unified course directory: regulated pathways, professional and vocational/employer learning.
create table if not exists public.course_catalogue (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, school_id uuid references public.schools(id), department_id uuid references public.school_departments(id),
 title text not null, slug text not null, course_family text not null check(course_family in ('regulated_pathway','professional','language','employer_short_course','vocational','trade','agriculture','hospitality','digital','custom_corporate')),
 awarding_route text not null default 'unipathway' check(awarding_route in ('OTHM','QUALIFI','IAB','ACCA','NAVTTC','TEVTA','partner_award','unipathway','non_award')),
 external_code text, level text, duration_value numeric, duration_unit text, delivery_modes text[] not null default array['online']::text[],
 practical_required boolean not null default false, employer_placement_supported boolean not null default false, description text, entry_requirements jsonb not null default '{}'::jsonb,
 price_pkr numeric, corporate_price_pkr numeric, active boolean not null default false, approval_status text not null default 'draft' check(approval_status in ('draft','review','approved','published','retired')),
 created_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table if not exists public.course_delivery_partners (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null references public.course_catalogue(id) on delete cascade,
 organisation_id uuid references public.career_organisations(id), partner_name text, city text, practical_scope text, agreement_reference text,
 verified boolean not null default false, active boolean not null default true
);
create table if not exists public.corporate_learning_accounts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, organisation_id uuid references public.career_organisations(id), company_name text not null,
 billing_model text not null default 'company_paid' check(billing_model in ('company_paid','employee_paid','subsidised','voucher','mixed')),
 account_manager_id uuid, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.corporate_course_offers (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, corporate_account_id uuid not null references public.corporate_learning_accounts(id) on delete cascade,
 course_id uuid not null references public.course_catalogue(id), seats integer, agreed_price_pkr numeric, delivery_mode text, city text, starts_on date, status text not null default 'proposed'
);
alter table public.course_catalogue enable row level security; alter table public.course_delivery_partners enable row level security; alter table public.corporate_learning_accounts enable row level security; alter table public.corporate_course_offers enable row level security;
create policy "catalogue published read" on public.course_catalogue for select to authenticated using(public.same_tenant(tenant_id) and (active=true or public.is_academic_manager()));
create policy "catalogue academic manage" on public.course_catalogue for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "delivery partners tenant read" on public.course_delivery_partners for select to authenticated using(public.same_tenant(tenant_id));
create policy "delivery partners academic manage" on public.course_delivery_partners for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "corporate accounts staff" on public.corporate_learning_accounts for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
