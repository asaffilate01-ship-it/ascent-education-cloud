-- Microsoft Education identity + Teams classroom orchestration.
create table if not exists public.microsoft_education_accounts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid not null, role_type text not null check(role_type in ('student','lecturer','staff','moderator')),
 entra_object_id text, user_principal_name text, institutional_email text, license_sku text, provisioning_status text not null default 'pending',
 provisioned_at timestamptz, disabled_at timestamptz, unique(tenant_id,user_id)
);
create table if not exists public.live_class_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid references public.modules(id), cohort_reference text,
 title text not null, provider text not null default 'microsoft_teams', provider_meeting_id text, calendar_event_id text, organizer_user_id uuid not null,
 moderator_user_ids uuid[] not null default '{}', starts_at timestamptz not null, ends_at timestamptz not null, join_url text, capacity integer not null default 300,
 class_mode text not null default 'lecture' check(class_mode in ('tutorial','seminar','workshop','lecture','webinar','townhall')),
 attendee_mic_default boolean not null default false, attendee_camera_default boolean not null default false,
 recording_enabled boolean not null default true, transcript_enabled boolean not null default true, whiteboard_enabled boolean not null default true,
 qna_enabled boolean not null default true, polls_enabled boolean not null default true, breakout_enabled boolean not null default false,
 status text not null default 'scheduled', created_at timestamptz not null default now()
);
create table if not exists public.live_class_artifacts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 artifact_type text not null check(artifact_type in ('recording','transcript','whiteboard','slides','attendance','qna','poll','ai_summary','revision_quiz')),
 provider_reference text, storage_reference text, metadata jsonb not null default '{}'::jsonb, available_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.live_class_attendance (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 student_id uuid, provider_participant_id text, joined_at timestamptz, left_at timestamptz, attendance_minutes numeric not null default 0,
 engagement jsonb not null default '{}'::jsonb, unique(session_id,student_id)
);
create table if not exists public.lesson_whiteboards (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid references public.live_class_sessions(id) on delete cascade,
 module_id uuid references public.modules(id), title text not null, template text not null default 'blank',
 content_reference text, microsoft_whiteboard_reference text, prepared_by uuid, locked_after_class boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.microsoft_education_accounts enable row level security; alter table public.live_class_sessions enable row level security; alter table public.live_class_artifacts enable row level security; alter table public.live_class_attendance enable row level security; alter table public.lesson_whiteboards enable row level security;
create policy "ms account own read" on public.microsoft_education_accounts for select to authenticated using(public.same_tenant(tenant_id) and (user_id=auth.uid() or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "live class tenant read" on public.live_class_sessions for select to authenticated using(public.same_tenant(tenant_id));
create policy "live class academic manage" on public.live_class_sessions for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "live artifacts tenant read" on public.live_class_artifacts for select to authenticated using(public.same_tenant(tenant_id));
create policy "attendance own academic read" on public.live_class_attendance for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "whiteboard tenant read" on public.lesson_whiteboards for select to authenticated using(public.same_tenant(tenant_id));
