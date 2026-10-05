# Database and E2E Verification

## Migration replay
Run scripts/verify-migration-replay.sh against the local Supabase stack. A clean reset must apply every migration from zero. CI also rejects duplicate migration timestamp prefixes and obvious RLS-disabling/grant-all patterns.

## Generated types
After a clean replay, generate TypeScript types from the resulting schema and compare/compile them before marking the generated-types readiness gate passed. Do not hand-edit generated types to hide schema drift.

## RLS integration test target
Automated database integration tests must create at least two tenants and representative users for student, parent/guardian, lecturer, assessor, IQA, finance, admissions, employer and leadership roles. Test allowed access and denied cross-user/cross-tenant access directly against Supabase, not only through React.

## Authenticated E2E target
Playwright journeys should cover application/KYC -> enrolment -> timetable/Teams -> materials/lab -> assignment -> specialist marker -> resubmission if applicable -> IQA -> released result; plus multi-payer payment/reconciliation and relevant tuition/employer/vocational variants.

These gates require a disposable test Supabase environment and seeded test identities. Static/unit contracts do not substitute for database-level evidence.
