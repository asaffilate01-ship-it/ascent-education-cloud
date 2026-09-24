-- First-class assessment roles and safe release RPC.
-- Uses existing public.user_roles(role app_role) model.

do $$ begin
  alter type public.app_role add value if not exists 'assessor';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'awarding_body_eqa';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'welfare_officer';
exception when duplicate_object then null; end $$;

create or replace function public.release_assessment_result(p_result_id uuid)
returns public.final_assessment_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.final_assessment_results;
  v_decision public.assessor_decisions;
  v_requires_iqa boolean;
  v_iqa_ok boolean;
begin
  select * into v_result from public.final_assessment_results where id = p_result_id for update;
  if not found then raise exception 'Result not found'; end if;

  if not (has_role(auth.uid(),'iqa_officer'::app_role)
      or has_role(auth.uid(),'centre_director'::app_role)
      or has_role(auth.uid(),'superadmin'::app_role)) then
    raise exception 'Not authorised to release results';
  end if;

  select * into v_decision from public.assessor_decisions where id=v_result.assessor_decision_id;
  if v_decision.decision <> 'assessed' or not v_decision.declaration_accepted then
    raise exception 'Human assessor decision/declaration incomplete';
  end if;

  select exists(
    select 1 from public.iqa_reviews
    where assessor_decision_id=v_decision.id
  ) into v_requires_iqa;

  if v_requires_iqa then
    select exists(
      select 1 from public.iqa_reviews
      where assessor_decision_id=v_decision.id and decision='approved'
    ) into v_iqa_ok;
    if not v_iqa_ok then raise exception 'IQA approval required'; end if;
  end if;

  update public.final_assessment_results
  set status='released', released_by=auth.uid(), released_at=now()
  where id=p_result_id
  returning * into v_result;

  update public.submission_attempts set status='released' where id=v_result.final_attempt_id;
  return v_result;
end $$;

revoke all on function public.release_assessment_result(uuid) from public;
grant execute on function public.release_assessment_result(uuid) to authenticated;
