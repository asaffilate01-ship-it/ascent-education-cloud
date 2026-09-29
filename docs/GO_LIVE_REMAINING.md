# Go-live remaining work

## P0 — must complete before real students
1. Restore deterministic dependency install: regenerate package-lock and switch CI back to npm ci.
2. Get CI green: lint, unit tests and production build.
3. Clean database replay from zero; reconcile duplicate/obsolete migrations and freeze a production baseline.
4. Regenerate Supabase TypeScript types from the deployed schema; remove critical any casts on security/payment/assessment paths.
5. Execute real database RLS tests for every role, cross-user and cross-tenant access, plus private storage policies.
6. Audit every Edge Function for authentication, tenant authorization, input validation, service-role use, rate limiting and secret handling.
7. End-to-end tests for admissions, assessment/resubmission/IQA/release, payments, tuition, vocational and corporate learning.
8. Production backup/restore drill, monitoring/error reporting, audit retention and incident procedure.
9. Legal/privacy/safeguarding/data-retention review for Pakistan operations and minors before launch.

## P1 — integration launch blockers for relevant features
- Microsoft Education approval, domain, Entra app, Graph permissions, licence mapping, Teams policies; then real meeting/calendar/account/artifact sync.
- Contracted payment gateway/mobile-wallet/bank integrations with signed webhooks and reconciliation.
- Authorised NADRA integration if/when contracted; otherwise documented manual KYC verification.
- Email/SMS institutional providers and deliverability setup.
- Private object storage for KYC, qualifications, assessment evidence and recordings.

## P1 — UX/operations
- Route/nav integrity across every role and mobile bottom nav.
- Finish action-first dashboards for student, parent, admissions, finance, director, employer and marker/IQA.
- Remove/retire legacy Jitsi and obsolete lecturer marking UI after Teams pilot.
- Empty/loading/error states, accessibility/keyboard checks, mobile/tablet QA.
- Course Factory content for actual launch programmes; do not market external approval until recorded.

## P2 — scale/native
- Seed/load test at 3,000 students and realistic submissions/notifications.
- Test 300+ cohort scheduling/attendance/artifact workflows (Teams media capacity is Microsoft-side).
- Query/index profiling, pagination and background-job resilience.
- PWA offline/update/deep-link polish; optional Capacitor native wrapper after stable PWA.
