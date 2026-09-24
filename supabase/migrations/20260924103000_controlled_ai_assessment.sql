-- Controlled AI-assisted assessment and resubmission workflow.
-- AI is advisory only. Final assessment is a human decision and release is QA-gated.
-- Qualification-specific policy can override penalties/caps.

create table if not exists public.assessment_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  programme_id uuid,
  module_id uuid references public.modules(id) on delete cascade,
  name text not null,
  version text not null,
  max_resubmissions integer not null default 1 check (max_resubmissions >= 0),
  allow_no_penalty_before_deadline boolean not null default true,
  late_rule text not null default 'manual' check (late_rule in ('none','percentage','fixed_marks','cap','manual')),
  late_value numeric,
  cap_grade numeric,
  active boolean not null default true,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  attempt_number integer not null check (attempt_number >= 1),
  submitted_at timestamptz not null default now(),
  deadline_at timestamptz,
  is_late boolean generated always as (deadline_at is not null and submitted_at > deadline_at) stored,
  file_reference text,
  content_hash text,
  word_count integer,
  status text not null default 'submitted' check (status in (
    'submitted','integrity_checked','ai_drafted','assessor_review',
    'resubmission_required','assessed','iqa_selected','iqa_approved',
    'iqa_action_required','released','superseded'
  )),
  unique(submission_id, attempt_number)
);

create table if not exists public.ai_assessment_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
  specification_version text not null,
  rubric_version text not null,
  model_provider text,
  model_name text not null,
  prompt_version text not null,
  criteria_results jsonb not null default '[]'::jsonb,
  suggested_grade numeric,
  suggested_outcome text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  integrity_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessor_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
  ai_draft_id uuid references public.ai_assessment_drafts(id),
  assessor_id uuid not null,
  criteria_decisions jsonb not null default '[]'::jsonb,
  raw_grade numeric,
  feedback text,
  decision text not null check (decision in ('resubmission_required','assessed')),
  ai_agreement text check (ai_agreement is null or ai_agreement in ('agree','modified','rejected')),
  ai_variance numeric,
  declaration_accepted boolean not null default false,
  decided_at timestamptz not null default now()
);

alter table public.iqa_reviews
  add column if not exists assessor_decision_id uuid references public.assessor_decisions(id),
  add column if not exists sampled_reason text,
  add column if not exists criteria_review jsonb not null default '[]'::jsonb;

create table if not exists public.final_assessment_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  final_attempt_id uuid not null references public.submission_attempts(id),
  assessor_decision_id uuid not null references public.assessor_decisions(id),
  policy_id uuid references public.assessment_policies(id),
  raw_grade numeric,
  late_adjustment numeric not null default 0,
  final_grade numeric,
  outcome text,
  released_by uuid,
  released_at timestamptz,
  status text not null default 'provisional' check (status in ('provisional','qa_hold','released','appealed')),
  unique(submission_id)
);

create table if not exists public.assessment_ai_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_attempt_id uuid not null references public.submission_attempts(id) on delete cascade,
  ai_draft_id uuid references public.ai_assessment_drafts(id),
  assessor_decision_id uuid references public.assessor_decisions(id),
  metric text not null,
  value jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_submission_attempts_submission on public.submission_attempts(submission_id, attempt_number);
create index if not exists idx_ai_assessment_attempt on public.ai_assessment_drafts(submission_attempt_id);
create index if not exists idx_assessor_decision_attempt on public.assessor_decisions(submission_attempt_id);
create index if not exists idx_final_results_submission on public.final_assessment_results(submission_id);

alter table public.assessment_policies enable row level security;
alter table public.submission_attempts enable row level security;
alter table public.ai_assessment_drafts enable row level security;
alter table public.assessor_decisions enable row level security;
alter table public.final_assessment_results enable row level security;
alter table public.assessment_ai_audit enable row level security;

comment on table public.ai_assessment_drafts is
'AI advisory assessment only. Never authoritative for final grade or release.';
comment on table public.final_assessment_results is
'Only human-assessed, policy-adjusted, QA-gated results may become released.';
