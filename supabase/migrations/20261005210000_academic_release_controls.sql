-- Academic decision/release controls: explicit human authority and immutable decision audit.
create table if not exists public.academic_release_decisions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_id uuid not null,
 student_id uuid not null, assessor_id uuid not null, iqa_required boolean not null default true, iqa_officer_id uuid,
 assessor_signed_at timestamptz, iqa_status text not null default 'pending' check(iqa_status in ('pending','approved','action_required','not_required')),
 iqa_signed_at timestamptz, release_status text not null default 'provisional' check(release_status in ('provisional','held','eligible','released','appealed')),
 released_by uuid, released_at timestamptz, release_reason text, created_at timestamptz not null default now()
);
create table if not exists public.academic_decision_audit (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, release_decision_id uuid not null references public.academic_release_decisions(id),
 actor_id uuid not null, action text not null, from_state text, to_state text, reason text, occurred_at timestamptz not null default now()
);
alter table public.academic_release_decisions enable row level security; alter table public.academic_decision_audit enable row level security;
create policy "release scoped read" on public.academic_release_decisions for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or assessor_id=auth.uid() or iqa_officer_id=auth.uid() or public.is_academic_manager()));
create policy "decision audit academic" on public.academic_decision_audit for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
revoke update, delete on public.academic_decision_audit from authenticated;
