# Lovable Staging & Live Validation Matrix

## Entry condition
Main Production CI must be green. The merged Omniqora Education main passed Production CI before this staging phase.

## Public journeys
Home, courses, course detail where configured, about, contact, application, login/register/password reset, privacy/terms/cookies/disclaimer, certificate verification. Test desktop, tablet and mobile; no promo access gate.

## Authenticated personas
Student: onboarding, dashboard, course/materials, Teams/live class, whiteboard/archive, assignments, grades, fees, library, STEMCoach entitlement, careers/progression, residential weeks, labs, notifications/settings.
Lecturer: dashboard, teaching, schedule, attendance, Teams/whiteboard/materials, help queues; no unauthorised summative release.
Assessor/marker: allocated submissions, criterion/rubric view, AI advisory, human decision/sign-off.
IQA: sampling, actions, approval/rejection; cannot IQA own assessment.
Admissions: application/KYC/offer/enrolment.
Finance: payer/payment/reconciliation; no academic result authority.
Employer: corporate learners/offers/placements only within organisation scope.
Parent/guardian: related learner only.
Director: operations, programmes, staff/students, QA, finance overview, schedule, reports, security/readiness.
Landlord/superadmin: tenant onboarding, isolation, subscriptions, audit/infrastructure.

## Education variants
Run at least one seeded journey for OTHM/Qualifi regulated learner, local short course, employer employee, tuition learner, vocational/partner practical learner and tech-lab learner.

## Browser/runtime
No console errors, dead routes, infinite loaders, missing empty states, broken mobile navigation, inaccessible dialogs or horizontal overflow. Validate slow network/reconnect and expired-session behaviour.

## Security negatives
Anonymous protected-route access; cross-tenant URL/UUID; student-to-student IDOR; lecturer cross-programme access; employer unrelated learner; finance grade release; expired/private evidence URL; direct API attempts.

## External integrations
A UI that renders is not proof of integration. Microsoft, payments, NADRA, STEMCoach SSO, Turnitin, labs, email/SMS and physical security remain blocked until real provider evidence is attached to Production Readiness.

## Exit
Zero P0/P1 runtime/security defects; all required launch journeys pass; main CI green after fixes; staging migration/security evidence complete before production.
