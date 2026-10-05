-- Seed the production definition of done. Replace pending with passed only with evidence.
insert into public.production_readiness_gates(tenant_id,gate_key,category,title,required,status,notes)
select t.id,v.k,v.c,v.title,true,'pending',v.note from public.tenants t cross join (values
('ci_green','engineering','CI/build/test green','Attach successful main-branch CI evidence.'),
('migration_replay','database','Clean migration replay','Replay from empty database and record result.'),
('generated_types','database','Generated database types current','Generate types from deployed schema and compile.'),
('rls_integration','security','RLS/IDOR integration tests passed','Test every role, cross-user and cross-tenant.'),
('storage_security','security','Private storage policies verified','KYC, evidence and recordings must not be public.'),
('edge_auth','security','Privileged Edge Functions audited','Authentication, tenant authorization, rate limits and secrets.'),
('e2e_academic','testing','Academic E2E journey passed','Admission through teaching, submission, marking, IQA and release.'),
('e2e_finance','testing','Finance E2E journey passed','Multi-payer, settlement, reconciliation and refund.'),
('backup_restore','operations','Backup and restore drill passed','Record recovery evidence and timings.'),
('monitoring','operations','Monitoring and incident alerts live','Errors, integration health and operational alerts.'),
('course_content','academic','Launch course packs approved','Student, teacher, assessment and QA packs versioned and approved.'),
('awarding_approvals','academic','Awarding-body status evidenced','Do not market approval without evidence.'),
('microsoft_live','integrations','Microsoft Education/Graph live','Provisioning, licences, Teams and account lifecycle tested.'),
('nadra_live_or_fallback','integrations','NADRA live or approved manual KYC fallback','Live requires authorised credentials; fallback must be operationally approved.'),
('payments_live','integrations','Production payments live','Provider credentials, signed webhooks and reconciliation tested.'),
('labs_live','integrations','At least one interactive lab provider live','Provision, launch, instructor assist, evidence and shutdown tested.'),
('stemcoach_live','integrations','STEMCoach SSO/progress live','Entitlement, SSO and progress sync tested.'),
('omniqora_factory','integrations','Central Omniqora Factory connected','Product registration/event export/health probe tested.'),
('native_release','native','Native app release pipeline ready','Android/iOS projects, signing, push, secure storage and store readiness.'),
('load_test','performance','Scale/load test passed','Target learner/cohort load and query/index profiling.'),
('safeguarding_privacy','compliance','Safeguarding/privacy/CCTV policies approved','Operational and legal review evidenced.'),
('staff_ops','operations','Staff/marker/IQA operating capacity ready','Vetting, training, availability and assignment workflows operational.')
) as v(k,c,title,note)
on conflict(tenant_id,gate_key) do nothing;
