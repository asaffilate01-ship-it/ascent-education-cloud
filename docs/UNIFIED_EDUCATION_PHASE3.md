# Unified Education Phase 3

## Course Factory
No course can move to Published until its required review stages are approved. Regulated provision includes regulatory and assessment gates; internal short courses still require academic, safeguarding, resources and commercial review. External award/approval claims must be backed by recorded approval evidence.

## Commerce
Education orders preserve purchaser type, course/cohort, student/sponsor contribution and provider reference. Checkout connectors should create orders server-side and confirm payment only from authenticated provider webhooks.

## Corporate bulk enrolment
Employer Academy accepts up to 1,000 employee records per controlled import into a contracted course offer. Invitation and learner-account activation are separate steps; duplicate employee references are upserted within the offer.

## Evidence
Learning evidence is a generic secure reference layer for vocational practical evidence, course assessments and other approved learner evidence. Files belong in private storage with signed URLs and role-scoped access.

## Notifications
Domain events queue in-app/email notifications for enrolment, payment, class changes, submissions, resubmissions, results, funding, practical sign-off and progression. Personal WhatsApp/phone communication remains prohibited for safeguarding; any institutional channel must use approved accounts/connectors.

## Production next
Payment-provider connector; private storage buckets/policies; corporate import UI/CSV validation; Course Factory editing forms; event dispatcher; Supabase type regeneration; automated RLS matrix; E2E lifecycle tests and load tests.
