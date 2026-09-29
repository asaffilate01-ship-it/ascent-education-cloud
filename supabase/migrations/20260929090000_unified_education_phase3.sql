-- Phase 3: checkout/payment ledger, bulk corporate imports, evidence uploads, course factory workflow and notifications.
create table if not exists public.education_orders (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, purchaser_user_id uuid, purchaser_type text not null check(purchaser_type in ('student','guardian','employer','sponsor')),
 course_id uuid references public.course_catalogue(id), cohort_id uuid references public.course_cohorts(id), enrolment_request_id uuid references public.course_enrolment_requests(id),
 subtotal_pkr numeric not null default 0, discount_pkr numeric not null default 0, sponsor_credit_pkr numeric not null default 0, total_pkr numeric not null default 0,
 status text not null default 'draft' check(status in ('draft','pending_payment','paid','part_paid','funded','cancelled','refunded')), provider text, provider_reference text, created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.learning_evidence (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, evidence_context text not null,
 context_reference uuid, evidence_type text not null, storage_reference text not null, file_name text, mime_type text, notes text,
 uploaded_at timestamptz not null default now(), verified_by uuid, verified_at timestamptz
);
create table if not exists public.course_factory_reviews (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null references public.course_catalogue(id),
 review_stage text not null check(review_stage in ('curriculum','regulatory','academic','assessment','resources','safeguarding','commercial','final_publish')),
 status text not null default 'pending' check(status in ('pending','in_review','changes_required','approved','rejected')), reviewer_id uuid,
 checklist jsonb not null default '[]'::jsonb, comments text, reviewed_at timestamptz, unique(course_id,review_stage)
);
create table if not exists public.platform_notification_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, user_id uuid, event_type text not null, entity_type text, entity_id uuid,
 channel_preferences jsonb not null default '{"in_app":true}'::jsonb, payload jsonb not null default '{}'::jsonb,
 status text not null default 'queued' check(status in ('queued','sent','failed','suppressed')), created_at timestamptz not null default now(), sent_at timestamptz
);
alter table public.education_orders enable row level security; alter table public.learning_evidence enable row level security; alter table public.course_factory_reviews enable row level security; alter table public.platform_notification_events enable row level security;
create policy "orders purchaser read" on public.education_orders for select to authenticated using(public.same_tenant(tenant_id) and (purchaser_user_id=auth.uid() or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "evidence own read" on public.learning_evidence for select to authenticated using(public.same_tenant(tenant_id) and (student_id=auth.uid() or public.is_academic_manager()));
create policy "evidence own upload" on public.learning_evidence for insert to authenticated with check(public.same_tenant(tenant_id) and student_id=auth.uid());
create policy "course factory academic" on public.course_factory_reviews for all to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id));
create policy "notifications own read" on public.platform_notification_events for select to authenticated using(public.same_tenant(tenant_id) and user_id=auth.uid());
