-- Microsoft Teams live-class connector and persistent lesson artifacts.
create table if not exists public.live_class_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid references public.modules(id), cohort_reference text,
 title text not null, provider text not null default 'microsoft_teams', provider_meeting_id text, provider_event_id text, organiser_user_id uuid not null,
 moderator_user_ids uuid[] not null default '{}', starts_at timestamptz not null, ends_at timestamptz not null, join_url text,
 capacity integer not null default 300, class_mode text not null default 'lecture' check(class_mode in ('lecture','seminar','workshop','tutorial','webinar','townhall')),
 attendee_mic_default boolean not null default false, attendee_camera_default boolean not null default false, recording_enabled boolean not null default true,
 transcript_enabled boolean not null default true, whiteboard_enabled boolean not null default true, qna_enabled boolean not null default true,
 polls_enabled boolean not null default true, status text not null default 'scheduled', created_at timestamptz not null default now()
);
create table if not exists public.live_class_artifacts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 artifact_type text not null check(artifact_type in ('recording','transcript','whiteboard','slides','attendance','qna','poll','ai_summary','revision_quiz')),
 provider_reference text, storage_reference text, metadata jsonb not null default '{}'::jsonb, available_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.live_class_attendance (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 student_id uuid, provider_participant_id text, joined_at timestamptz, left_at timestamptz, attendance_minutes numeric not null default 0,
 engagement jsonb not null default '{}'::jsonb, source text not null default 'teams_graph', unique(session_id,student_id)
);
alter table public.live_class_sessions enable row level security; alter table public.live_class_artifacts enable row level security; alter table public.live_class_attendance enable row level security;
create policy "live sessions tenant read" on public.live_class_sessions for select to authenticated using(public.same_tenant(tenant_id));
create policy "live sessions academic manage" on public.live_class_sessions for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "live artifacts tenant read" on public.live_class_artifacts for select to authenticated using(public.same_tenant(tenant_id));
create policy "live attendance own staff read" on public.live_class_attendance for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
