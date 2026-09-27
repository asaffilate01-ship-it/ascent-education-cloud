-- Academic operations production layer
-- Adds controlled assessment/IQA, progression, employer expo, centre-week capacity,
-- identity review and curriculum mapping primitives.

create table if not exists public.assessment_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  assessor_id uuid not null,
  status text not null default 'assessed' check (status in ('assessed','iqa_selected','iqa_approved','iqa_rejected','released')),
  grade numeric,
  feedback text,
  assessed_at timestamptz default now(),
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.iqa_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assessment_review_id uuid not null references public.assessment_reviews(id) on delete cascade,
  iqa_id uuid not null,
  decision text not null check (decision in ('approved','rejected','action_required')),
  notes text,
  reviewed_at timestamptz not null default now(),
  constraint iqa_not_assessor check (iqa_id <> (select assessor_id from public.assessment_reviews ar where ar.id = assessment_review_id))
);

create table if not exists public.progression_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  student_id uuid not null,
  target_country text not null default 'UK',
  target_subject text,
  assigned_officer uuid,
  passport_status text default 'missing',
  english_status text default 'unknown',
  academic_status text default 'on_track',
  stage text not null default 'planning',
  next_action text,
  next_action_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.university_referrals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  progression_case_id uuid not null references public.progression_cases(id) on delete cascade,
  university_id uuid,
  programme_name text,
  intake text,
  referral_code text,
  status text not null default 'shortlisted',
  commission_expected numeric default 0,
  commission_received numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.employer_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  employer_user_id uuid,
  title text not null,
  opportunity_type text not null default 'internship',
  department text,
  city text,
  requirements text,
  places integer not null default 1,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.career_expo_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  residential_week_id uuid,
  title text not null,
  event_type text not null check (event_type in ('university_progression','employer_expo','careers','mixed')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer,
  created_at timestamptz not null default now()
);

create table if not exists public.curriculum_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  module_id uuid not null references public.modules(id) on delete cascade,
  awarding_body text not null,
  specification_version text,
  learning_outcome_code text not null,
  learning_outcome text not null,
  assessment_criteria jsonb not null default '[]'::jsonb,
  glh numeric,
  tqt numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  student_id uuid not null,
  document_type text not null,
  document_reference text,
  selfie_reference text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','manual_review')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_reviews_tenant on public.assessment_reviews(tenant_id);
create index if not exists idx_iqa_reviews_tenant on public.iqa_reviews(tenant_id);
create index if not exists idx_progression_cases_tenant on public.progression_cases(tenant_id);
create index if not exists idx_university_referrals_tenant on public.university_referrals(tenant_id);
create index if not exists idx_employer_opportunities_tenant on public.employer_opportunities(tenant_id);
create index if not exists idx_curriculum_outcomes_module on public.curriculum_outcomes(module_id);
create index if not exists idx_identity_reviews_student on public.identity_reviews(student_id);

-- RLS is deliberately enabled before production data is used.
alter table public.assessment_reviews enable row level security;
alter table public.iqa_reviews enable row level security;
alter table public.progression_cases enable row level security;
alter table public.university_referrals enable row level security;
alter table public.employer_opportunities enable row level security;
alter table public.career_expo_events enable row level security;
alter table public.curriculum_outcomes enable row level security;
alter table public.identity_reviews enable row level security;
