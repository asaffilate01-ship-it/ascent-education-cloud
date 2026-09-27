-- Academic integrity evidence, policy and human case management.
create table if not exists public.assessment_ai_use_policies (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, assignment_id uuid not null references public.assignments(id) on delete cascade,
 ai_rule text not null default 'declaration_required' check(ai_rule in ('prohibited','research_only','permitted_with_declaration','permitted','declaration_required')),
 student_declaration_required boolean not null default true, notes text, active boolean not null default true, unique(tenant_id,assignment_id)
);
create table if not exists public.student_ai_declarations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
 used_ai boolean not null, tools text[], purpose text, prompts_or_notes text, declaration_text text, declared_at timestamptz not null default now(),
 unique(submission_attempt_id)
);
create table if not exists public.integrity_evidence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
 evidence_type text not null check(evidence_type in ('similarity','ai_writing_indicator','citation_check','source_check','style_change','document_metadata','submission_history','authenticity_viva','manual_note')),
 provider text, score numeric, severity text not null default 'info' check(severity in ('info','review','high')), summary text,
 report_reference text, evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.integrity_cases (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
 status text not null default 'review' check(status in ('review','no_concern','student_discussion','formal_investigation','resolved','appealed')),
 risk_level text not null default 'review' check(risk_level in ('low','review','high')), summary text, assigned_to uuid,
 human_decision text, decision_reason text, decided_by uuid, decided_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.authenticity_vivas (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integrity_case_id uuid not null references public.integrity_cases(id) on delete cascade,
 scheduled_at timestamptz, conducted_by uuid, recording_reference text, questions jsonb not null default '[]'::jsonb, notes text,
 outcome text check(outcome is null or outcome in ('authenticity_supported','further_review','referred')), completed_at timestamptz
);
alter table public.assessment_ai_use_policies enable row level security; alter table public.student_ai_declarations enable row level security;
alter table public.integrity_evidence enable row level security; alter table public.integrity_cases enable row level security; alter table public.authenticity_vivas enable row level security;
create policy "ai use policy tenant read" on public.assessment_ai_use_policies for select to authenticated using(public.same_tenant(tenant_id));
create policy "ai use policy academic manage" on public.assessment_ai_use_policies for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "student declaration own" on public.student_ai_declarations for all to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.submission_attempts sa join public.submissions s on s.id=sa.submission_id where sa.id=submission_attempt_id and s.student_id=auth.uid())) with check(public.same_tenant(tenant_id));
create policy "integrity evidence authorised read" on public.integrity_evidence for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)));
create policy "integrity cases authorised read" on public.integrity_cases for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)));
create policy "integrity cases quality manage" on public.integrity_cases for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'iqa_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "viva quality manage" on public.authenticity_vivas for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
