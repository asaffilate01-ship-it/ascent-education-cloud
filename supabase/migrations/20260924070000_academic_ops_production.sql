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
  reviewed_at timestamptz not null default now()
);

-- PostgreSQL forbids subqueries in CHECK constraints. Enforce same-tenant,
-- separate marker/IQA instead, including on assessor reassignment.
-- This source migration was not present in the connected production registry
-- at the October 20 audit; validate it in isolated staging before use.
create or replace function public.unipathway_iqa_separation_guard()
returns trigger language plpgsql security definer set search_path=public as $uni_iqa_guard$
declare assigned_marker uuid; parent_tenant uuid;
begin
  select ar.assessor_id,ar.tenant_id into assigned_marker,parent_tenant
  from public.assessment_reviews ar where ar.id=new.assessment_review_id;
  if not found or parent_tenant is distinct from new.tenant_id then
    raise exception 'IQA review must belong to the assessment tenant' using errcode='23514';
  end if;
  if new.iqa_id=assigned_marker then
    raise exception 'Independent IQA reviewer must differ from original assessor' using errcode='23514';
  end if;
  return new;
end
$uni_iqa_guard$;

create or replace function public.unipathway_assessor_change_guard()
returns trigger language plpgsql security definer set search_path=public as $uni_marker_guard$
begin
  if exists(select 1 from public.iqa_reviews ir where ir.assessment_review_id=new.id
     and ir.iqa_id=new.assessor_id) then
    raise exception 'Changing assessor would violate independent IQA review' using errcode='23514';
  end if;
  return new;
end
$uni_marker_guard$;

drop trigger if exists enforce_uni_iqa_separation on public.iqa_reviews;
create trigger enforce_uni_iqa_separation
  before insert or update of assessment_review_id,tenant_id,iqa_id on public.iqa_reviews
  for each row execute function public.unipathway_iqa_separation_guard();
drop trigger if exists enforce_uni_marker_independence on public.assessment_reviews;
create trigger enforce_uni_marker_independence
  before update of assessor_id on public.assessment_reviews
  for each row execute function public.unipathway_assessor_change_guard();

revoke all on function public.unipathway_iqa_separation_guard() from public,anon;
revoke all on function public.unipathway_assessor_change_guard() from public,anon;

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
