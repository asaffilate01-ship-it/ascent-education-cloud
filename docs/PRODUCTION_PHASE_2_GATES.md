# Production Phase 2 Security Gates

## Required before public go-live
- regenerate Supabase TypeScript types from the migrated production schema
- execute every migration against staging from a clean database and from the current production baseline
- RLS negative tests: cross-tenant and cross-role SELECT/INSERT/UPDATE/DELETE
- storage bucket policies for KYC, assignments, teaching videos, certificates, health/welfare and evidence
- privileged MFA
- rotate any credential ever committed to git
- webhook idempotency
- append-only audit events
- backup restore drill
- E2E: admissions/KYC, teaching, submission/resubmission, specialist marking, IQA/release, parent released-result access, progression, funding and centre access
- load test 3,000 active learners plus peak assessment window

## UX gate
Every dashboard should start with actionable work. Action Centre aggregates marking, IQA, admissions/KYC, progression, finance, funding, compliance and operational tasks while retaining role-specific workspaces.

## Safeguarding communications
Default policy for teaching staff: LMS + managed institutional domain email only. No personal email, personal phone, WhatsApp or social DMs. Lecturer views never expose student home address. Emergency/welfare exceptions require separate authorised roles and audit.
