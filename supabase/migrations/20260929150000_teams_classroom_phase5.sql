-- Phase 5: calendar sync, account onboarding and classroom notifications.
create table if not exists public.microsoft_calendar_sync (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 user_id uuid not null, event_id text, sync_status text not null default 'pending', last_synced_at timestamptz, error_message text, unique(session_id,user_id)
);
create table if not exists public.microsoft_account_onboarding (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, account_id uuid not null references public.microsoft_education_accounts(id) on delete cascade,
 welcome_sent boolean not null default false, first_signin_at timestamptz, password_setup_status text not null default 'pending',
 mfa_status text not null default 'pending', terms_accepted_at timestamptz, onboarding_completed_at timestamptz, unique(account_id)
);
create table if not exists public.class_notification_rules (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, event_type text not null,
 minutes_before integer, in_app boolean not null default true, institutional_email boolean not null default true,
 audience text not null default 'students', active boolean not null default true
);
alter table public.microsoft_calendar_sync enable row level security; alter table public.microsoft_account_onboarding enable row level security; alter table public.class_notification_rules enable row level security;
create policy "calendar own read" on public.microsoft_calendar_sync for select to authenticated using(public.same_tenant(tenant_id) and (user_id=auth.uid() or public.is_academic_manager()));
create policy "onboarding own read" on public.microsoft_account_onboarding for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.microsoft_education_accounts a where a.id=account_id and a.user_id=auth.uid()));
create policy "notification rules academic" on public.class_notification_rules for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
