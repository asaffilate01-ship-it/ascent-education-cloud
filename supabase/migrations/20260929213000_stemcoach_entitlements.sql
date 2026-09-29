-- STEMCoach entitlement and partner promotion integration.
create table if not exists public.stemcoach_entitlements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null,
 source text not null check(source in ('unipathway_enrolment','school_partner','employer_partner','paid_direct','promotion')),
 region text not null default 'PK', programme_id uuid, course_family text, external_stemcoach_user_id text,
 entitlement text not null default 'course_access', starts_at timestamptz not null default now(), ends_at timestamptz,
 status text not null default 'active' check(status in ('pending','active','suspended','expired','revoked')), metadata jsonb not null default '{}'::jsonb,
 unique(tenant_id,user_id,source,programme_id)
);
create table if not exists public.stemcoach_partner_campaigns (
 id uuid primary key default gen_random_uuid(), tenant_id uuid, region text not null, partner_name text not null,
 headline text not null, offer_code text, eligibility jsonb not null default '{}'::jsonb, starts_at timestamptz, ends_at timestamptz,
 active boolean not null default true, metadata jsonb not null default '{}'::jsonb
);
alter table public.stemcoach_entitlements enable row level security; alter table public.stemcoach_partner_campaigns enable row level security;
create policy "stemcoach entitlement own read" on public.stemcoach_entitlements for select to authenticated using(public.same_tenant(tenant_id) and user_id=auth.uid());
create policy "stemcoach entitlement admin" on public.stemcoach_entitlements for all to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "stemcoach campaign authenticated read" on public.stemcoach_partner_campaigns for select to authenticated using(active=true);
