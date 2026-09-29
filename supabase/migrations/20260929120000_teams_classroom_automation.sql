-- Teams automation, moderator workflow and AI lesson-pack lifecycle.
alter table public.live_class_sessions add column if not exists schedule_source text not null default 'manual';
alter table public.live_class_sessions add column if not exists teams_sync_status text not null default 'pending';
alter table public.live_class_sessions add column if not exists artifact_sync_status text not null default 'pending';
alter table public.live_class_sessions add column if not exists lesson_pack_status text not null default 'pending';

create table if not exists public.live_class_moderation_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 moderator_user_id uuid not null, event_type text not null check(event_type in ('question_triaged','hand_raised','student_unmuted','student_muted','removed','technical_issue','attendance_exception','incident','note')),
 student_id uuid, notes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.lesson_ai_packs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, session_id uuid not null references public.live_class_sessions(id) on delete cascade,
 summary text, key_concepts jsonb not null default '[]'::jsonb, glossary jsonb not null default '[]'::jsonb,
 revision_questions jsonb not null default '[]'::jsonb, quiz jsonb not null default '[]'::jsonb, source_artifact_ids uuid[] not null default '{}',
 status text not null default 'draft' check(status in ('draft','human_review','approved','published','rejected')), reviewed_by uuid, reviewed_at timestamptz,
 unique(session_id)
);
alter table public.live_class_moderation_events enable row level security; alter table public.lesson_ai_packs enable row level security;
create policy "moderation academic manage" on public.live_class_moderation_events for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "lesson packs tenant read" on public.lesson_ai_packs for select to authenticated using(public.same_tenant(tenant_id));
create policy "lesson packs academic manage" on public.lesson_ai_packs for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
