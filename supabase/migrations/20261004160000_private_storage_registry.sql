-- Production storage policy registry. Actual storage.objects policies must be verified against deployed bucket IDs.
create table if not exists public.private_storage_registry (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, bucket_key text not null,
 data_class text not null, public_allowed boolean not null default false, max_signed_url_seconds integer not null default 900,
 retention_policy text, required_roles text[] not null default '{}', unique(tenant_id,bucket_key)
);
alter table public.private_storage_registry enable row level security;
create policy "storage registry leadership" on public.private_storage_registry for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
