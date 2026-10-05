-- Test support only: canonical role matrix for database integration harnesses.
create table if not exists public.security_test_role_matrix (
 role_key text primary key, own_scope text not null, forbidden_scope text[] not null default '{}'
);
insert into public.security_test_role_matrix(role_key,own_scope,forbidden_scope) values
('student','own learner record',array['other_student','other_tenant','marker_pack','finance_admin']),
('lecturer','assigned teaching',array['unassigned_student','release_grade','other_tenant']),
('assessor','allocated assessment',array['unallocated_assessment','release_grade','other_tenant']),
('iqa_officer','assigned QA scope',array['other_tenant']),
('finance_officer','tenant finance',array['academic_decision','other_tenant']),
('employer_partner','own corporate account',array['unrelated_student','other_employer','other_tenant']),
('centre_director','own tenant leadership',array['other_tenant'])
on conflict(role_key) do update set own_scope=excluded.own_scope,forbidden_scope=excluded.forbidden_scope;
alter table public.security_test_role_matrix enable row level security;
create policy "authenticated may read role matrix" on public.security_test_role_matrix for select to authenticated using(true);
