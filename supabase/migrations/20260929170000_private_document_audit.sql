-- Private evidence storage hardening. Policies assume buckets are created private.
-- Never create public URLs for KYC, qualification, submission, practical or assessment evidence.
create table if not exists public.secure_document_access_log (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null,
 bucket text not null, object_path text not null, action text not null check(action in ('view','download','upload','replace','delete')),
 purpose text, created_at timestamptz not null default now()
);
alter table public.secure_document_access_log enable row level security;
create policy "secure access own privileged read" on public.secure_document_access_log for select to authenticated
using(public.same_tenant(tenant_id) and (user_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
revoke update, delete on public.secure_document_access_log from authenticated;
