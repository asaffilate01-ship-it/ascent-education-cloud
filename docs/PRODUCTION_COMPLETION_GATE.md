# Production Completion Gate

No production launch until all mandatory gates are evidenced.

## Build
- clean npm ci, lint, unit tests and production build
- regenerate Supabase TypeScript types from deployed schema
- replay all migrations against an empty project/database
- resolve duplicate/obsolete development migrations before baseline freeze

## Security / RLS
Automated positive and negative tests for tenant isolation and roles: student, parent, lecturer, specialist marker/assessor, IQA, EQA, admissions, finance, employer, university partner, agent, centre director and superadmin.
Mandatory negatives include cross-tenant read/write, student-to-student access, lecturer private-address access, lecturer summative grade release, client-side payment settlement, employer unrelated-candidate access and unauthorised evidence access.

## Core E2E
Applicant -> KYC/education -> admission -> enrolment -> Microsoft account -> class -> attendance -> assignment -> specialist marker -> resubmission -> IQA -> final release -> progression.
Payment: student/guardian/employer/government split -> settlement/reconciliation -> invoice/refund.
Tuition: guardian/student -> subscription -> live class -> progress -> parent view.
Vocational: enrol -> partner practical -> logbook -> supervisor -> assessor -> outcome.
Employer: corporate offer -> bulk seats -> employee learning -> completion report.

## Mobile/PWA
All primary roles: route integrity, bottom nav, keyboard/forms, safe areas, offline shell, install/update, responsive tables/cards, camera/document upload and deep links.

## Performance
Seed 3,000 students, realistic courses/submissions/notifications; API/query latency and database indexes; classroom scheduling for 300+ cohort; background jobs; artifact/list pagination.

## External integrations
Production credentials and signed-webhook verification for payments; Microsoft Education/Entra/Graph; email/SMS as approved; NADRA only when an authorised integration is contracted.

## Legacy cleanup
Jitsi/JaaS stays disabled until Teams pilot passes, then remove legacy UI/function/config through reviewed migration/code PR.
