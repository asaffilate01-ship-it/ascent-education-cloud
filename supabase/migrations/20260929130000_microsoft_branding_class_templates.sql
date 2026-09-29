-- Microsoft branding, classroom templates and institutional account lifecycle.
create table if not exists public.microsoft_brand_profiles (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null default 'UniPathway',
 primary_hex text, logo_light_reference text, logo_dark_reference text, meeting_background_reference text, signin_background_reference text,
 invitation_logo_reference text, help_url text, privacy_url text, terms_url text, active boolean not null default true, unique(tenant_id,name)
);
create table if not exists public.teams_class_templates (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null,
 class_mode text not null check(class_mode in ('tutorial','seminar','workshop','lecture','webinar','townhall')),
 min_students integer not null default 1, max_students integer, mic_default boolean not null default false, camera_default boolean not null default false,
 whiteboard boolean not null default true, qna boolean not null default true, polls boolean not null default true, breakout boolean not null default false,
 moderator_required boolean not null default false, recording_default boolean not null default true, transcript_default boolean not null default true,
 teams_brand_theme text, active boolean not null default true, unique(tenant_id,name)
);
create table if not exists public.microsoft_account_lifecycle_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, account_id uuid not null references public.microsoft_education_accounts(id) on delete cascade,
 event_type text not null check(event_type in ('requested','provisioned','license_assigned','mailbox_ready','teams_ready','password_reset','suspended','graduated','withdrawn','disabled','retention_started','deleted')),
 status text not null default 'pending', external_reference text, notes text, created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.microsoft_brand_profiles enable row level security; alter table public.teams_class_templates enable row level security; alter table public.microsoft_account_lifecycle_events enable row level security;
create policy "brand tenant read" on public.microsoft_brand_profiles for select to authenticated using(public.same_tenant(tenant_id));
create policy "brand superadmin manage" on public.microsoft_brand_profiles for all to authenticated using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'superadmin'::app_role)) with check(public.same_tenant(tenant_id));
create policy "templates tenant read" on public.teams_class_templates for select to authenticated using(public.same_tenant(tenant_id));
create policy "templates academic manage" on public.teams_class_templates for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "ms lifecycle own admin read" on public.microsoft_account_lifecycle_events for select to authenticated using(public.same_tenant(tenant_id) and (exists(select 1 from public.microsoft_education_accounts a where a.id=account_id and a.user_id=auth.uid()) or public.has_role(auth.uid(),'superadmin'::app_role)));
