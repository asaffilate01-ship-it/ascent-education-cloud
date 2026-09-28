-- Production phase 2: institutional communications enforcement and action centre.
create table if not exists public.communication_policies (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, audience text not null,
 allow_lms boolean not null default true, allow_domain_email boolean not null default true,
 allow_personal_email boolean not null default false, allow_personal_phone boolean not null default false,
 allow_whatsapp boolean not null default false, allow_social_dm boolean not null default false,
 student_address_visible boolean not null default false, active boolean not null default true,
 unique(tenant_id,audience)
);
create table if not exists public.action_items (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null, action_type text not null,
 title text not null, description text, source_type text, source_id uuid, priority text not null default 'normal' check(priority in ('low','normal','high','critical')),
 due_at timestamptz, status text not null default 'open' check(status in ('open','in_progress','done','dismissed')),
 action_url text, created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.communication_policies enable row level security; alter table public.action_items enable row level security;
create policy "communication policies tenant read" on public.communication_policies for select to authenticated using(public.same_tenant(tenant_id));
create policy "communication policies director manage" on public.communication_policies for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "actions own read" on public.action_items for select to authenticated using(public.same_tenant(tenant_id) and user_id=auth.uid());
create policy "actions own update" on public.action_items for update to authenticated using(public.same_tenant(tenant_id) and user_id=auth.uid());
