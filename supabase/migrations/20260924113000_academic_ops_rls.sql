-- Academic operations RLS and role-scoped evidence access.
-- Explicitly scopes all new academic-ops tables to tenant and actor role.

create or replace function public.same_tenant(_tenant uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select _tenant = public.get_user_tenant_id(auth.uid())
      or public.has_role(auth.uid(),'superadmin'::app_role)
$$;

create or replace function public.is_academic_manager()
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role(auth.uid(),'centre_director'::app_role)
      or public.has_role(auth.uid(),'programme_leader'::app_role)
      or public.has_role(auth.uid(),'iqa_officer'::app_role)
      or public.has_role(auth.uid(),'superadmin'::app_role)
$$;

-- New controlled assessment tables
create policy "assessment policies tenant read" on public.assessment_policies for select to authenticated
using (public.same_tenant(tenant_id));
create policy "assessment policies academic manage" on public.assessment_policies for all to authenticated
using (public.same_tenant(tenant_id) and public.is_academic_manager())
with check (public.same_tenant(tenant_id) and public.is_academic_manager());

create policy "attempt student or academic read" on public.submission_attempts for select to authenticated
using (public.same_tenant(tenant_id) and (
  public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)
  or exists(select 1 from public.submissions s where s.id=submission_id and s.student_id=auth.uid())
));
create policy "attempt student insert" on public.submission_attempts for insert to authenticated
with check (public.same_tenant(tenant_id) and exists(select 1 from public.submissions s where s.id=submission_id and s.student_id=auth.uid()));
create policy "attempt academic update" on public.submission_attempts for update to authenticated
using (public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)));

create policy "ai drafts academic read" on public.ai_assessment_drafts for select to authenticated
using (public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)));
create policy "ai drafts system academic insert" on public.ai_assessment_drafts for insert to authenticated
with check (public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)));

create policy "assessor decisions academic read" on public.assessor_decisions for select to authenticated
using (public.same_tenant(tenant_id) and (public.is_academic_manager() or assessor_id=auth.uid()));
create policy "assessor owns decision insert" on public.assessor_decisions for insert to authenticated
with check (public.same_tenant(tenant_id) and assessor_id=auth.uid() and public.has_role(auth.uid(),'assessor'::app_role));
create policy "assessor owns provisional update" on public.assessor_decisions for update to authenticated
using (public.same_tenant(tenant_id) and assessor_id=auth.uid());

create policy "final results scoped read" on public.final_assessment_results for select to authenticated
using (public.same_tenant(tenant_id) and (
  public.is_academic_manager() or public.has_role(auth.uid(),'assessor'::app_role)
  or (status='released' and exists(select 1 from public.submissions s where s.id=submission_id and s.student_id=auth.uid()))
  or (status='released' and exists(select 1 from public.parent_student_links p join public.submissions s on s.student_id=p.student_id where p.parent_id=auth.uid() and p.verified=true and s.id=submission_id))
));
create policy "final results academic manage" on public.final_assessment_results for all to authenticated
using (public.same_tenant(tenant_id) and public.is_academic_manager())
with check (public.same_tenant(tenant_id) and public.is_academic_manager());

create policy "ai audit quality read" on public.assessment_ai_audit for select to authenticated
using (public.same_tenant(tenant_id) and public.is_academic_manager());

-- Foundation academic ops
create policy "assessment reviews academic read" on public.assessment_reviews for select to authenticated
using (public.same_tenant(tenant_id) and (public.is_academic_manager() or assessor_id=auth.uid()));
create policy "assessment reviews assessor manage" on public.assessment_reviews for all to authenticated
using (public.same_tenant(tenant_id) and (assessor_id=auth.uid() or public.is_academic_manager()))
with check (public.same_tenant(tenant_id));

create policy "iqa reviews quality read" on public.iqa_reviews for select to authenticated
using (public.same_tenant(tenant_id) and (public.is_academic_manager() or iqa_id=auth.uid()));
create policy "iqa reviews iqa manage" on public.iqa_reviews for all to authenticated
using (public.same_tenant(tenant_id) and (iqa_id=auth.uid() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)))
with check (public.same_tenant(tenant_id));

create policy "curriculum tenant read" on public.curriculum_outcomes for select to authenticated using(public.same_tenant(tenant_id));
create policy "curriculum academic manage" on public.curriculum_outcomes for all to authenticated
using(public.same_tenant(tenant_id) and public.is_academic_manager()) with check(public.same_tenant(tenant_id) and public.is_academic_manager());

create policy "identity authorised read" on public.identity_reviews for select to authenticated
using(public.same_tenant(tenant_id) and (
 public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role) or student_id=auth.uid()
));
create policy "identity admissions manage" on public.identity_reviews for all to authenticated
using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'admissions_admin'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)))
with check(public.same_tenant(tenant_id));

-- EQA: read-only and tenant scoped for academic evidence. A later assignment table will narrow this to named qualification samples.
create policy "eqa programmes read" on public.programmes for select to authenticated
using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'awarding_body_eqa'::app_role));
create policy "eqa modules read" on public.modules for select to authenticated
using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'awarding_body_eqa'::app_role));
create policy "eqa curriculum read" on public.curriculum_outcomes for select to authenticated
using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'awarding_body_eqa'::app_role));
create policy "eqa assessment reviews read" on public.assessment_reviews for select to authenticated
using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'awarding_body_eqa'::app_role));
create policy "eqa iqa reviews read" on public.iqa_reviews for select to authenticated
using(public.same_tenant(tenant_id) and public.has_role(auth.uid(),'awarding_body_eqa'::app_role));
