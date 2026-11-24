-- Applicant-owned drafts; verification decisions remain in existing KYC workflow.
create table public.onboarding_application_drafts (
 user_id uuid not null references auth.users(id) on delete cascade,
 tenant_id uuid not null,
 kind text not null check (kind in ('student','lecturer')),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<=40000),
 updated_at timestamptz not null default now(),
 primary key(user_id,tenant_id,kind)
);
alter table public.onboarding_application_drafts enable row level security;
revoke all on public.onboarding_application_drafts from anon,authenticated;
grant select,insert,update on public.onboarding_application_drafts to authenticated;
create policy "own application drafts" on public.onboarding_application_drafts for all to authenticated
using (user_id=auth.uid() and tenant_id=public.current_unipathway_tenant_id())
with check (user_id=auth.uid() and tenant_id=public.current_unipathway_tenant_id()
and ((kind='student' and public.has_role(auth.uid(),'student'::app_role)) or (kind='lecturer' and public.has_role(auth.uid(),'lecturer'::app_role))));
create policy "authorised application review" on public.onboarding_application_drafts for select to authenticated
using (tenant_id=public.current_unipathway_tenant_id() and
(exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.tenant_id=onboarding_application_drafts.tenant_id and r.role::text='centre_director') or public.has_role(auth.uid(),'superadmin'::app_role)
or (kind='student' and exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.tenant_id=onboarding_application_drafts.tenant_id and r.role::text='admissions_admin'))));
