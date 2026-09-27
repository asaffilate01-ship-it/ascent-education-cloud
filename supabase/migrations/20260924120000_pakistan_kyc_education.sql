-- Pakistan admissions KYC and education-verification layer.
create table if not exists public.student_kyc_cases (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null,
 identity_type text not null check(identity_type in ('CNIC','NICOP','POC','JUVENILE_CARD','CRC_BFORM','PASSPORT')),
 identity_number text, identity_status text not null default 'pending' check(identity_status in ('pending','documents_uploaded','nadra_pending','nadra_verified','manual_review','verified','rejected')),
 education_status text not null default 'pending' check(education_status in ('pending','documents_uploaded','verification_pending','verified','discrepancy','rejected')),
 eligibility_status text not null default 'pending' check(eligibility_status in ('pending','review','eligible','ineligible','conditional')),
 consent_nadra boolean not null default false, consent_at timestamptz, reviewed_by uuid, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,student_id)
);
create table if not exists public.identity_verification_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, kyc_case_id uuid not null references public.student_kyc_cases(id) on delete cascade,
 provider text not null default 'manual', method text not null default 'document', provider_reference text,
 status text not null check(status in ('initiated','consent_required','pending','verified','failed','manual_review')),
 attributes_verified jsonb not null default '{}'::jsonb, response_metadata jsonb not null default '{}'::jsonb,
 verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.education_credentials (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, kyc_case_id uuid not null references public.student_kyc_cases(id) on delete cascade,
 credential_type text not null, institution text, board_university text, qualification_title text, roll_number text, registration_number text,
 certificate_number text, award_date date, grade text, marks jsonb not null default '{}'::jsonb, document_reference text,
 verification_source text, verification_reference text, status text not null default 'uploaded' check(status in ('uploaded','ai_extracted','verification_pending','verified','discrepancy','rejected')),
 extracted_data jsonb not null default '{}'::jsonb, discrepancy_flags jsonb not null default '[]'::jsonb, verified_by uuid, verified_at timestamptz, created_at timestamptz not null default now()
);
alter table public.student_kyc_cases enable row level security;
alter table public.identity_verification_events enable row level security;
alter table public.education_credentials enable row level security;
create policy "kyc student read" on public.student_kyc_cases for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "kyc admissions manage" on public.student_kyc_cases for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "kyc student create" on public.student_kyc_cases for insert to authenticated with check(public.same_tenant(tenant_id) and student_id=auth.uid());
create policy "identity events authorised read" on public.identity_verification_events for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.student_kyc_cases k where k.id=kyc_case_id and (k.student_id=auth.uid() or public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))));
create policy "education authorised read" on public.education_credentials for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.student_kyc_cases k where k.id=kyc_case_id and (k.student_id=auth.uid() or public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))));
create policy "education student upload" on public.education_credentials for insert to authenticated with check(public.same_tenant(tenant_id) and exists(select 1 from public.student_kyc_cases k where k.id=kyc_case_id and k.student_id=auth.uid()));
create policy "education admissions manage" on public.education_credentials for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
