# Guardian and tuition activation

The legacy production database had parent-link records but none of the newer consent, conversation or formative-learning services used by the portal. This release installs bounded compatibility migrations for those services; databases with the existing modern services retain their invited-class implementation.

## Connected workflows

- Admissions/directors verify confirmed guardian and learner accounts in the same centre using an evidence reference. Parent requests cannot self-verify. Identity reassignment is blocked and reverification clears sharing permissions.
- Students have a dedicated Family sharing page for separate attendance, schedule and communication permissions. Practice summaries remain separately shared per plan.
- Parents see consent-filtered attendance and planned weekly programme sessions in Pakistan time. No meeting URLs, private diagnostic evidence or raw answers are shared. Cohort-specific timetable entries are excluded until actual cohort membership is available; weekly rows are not represented as confirmed live invitations.
- Authorised staff and guardians can exchange in-app messages with retry-safe request IDs, a shared rate limit and permission rechecking. This does not send email, WhatsApp or SMS.
- Assigned tutors can create individual diagnostic plans, set practice tasks, review student attempts or help requests and record immutable formative feedback. Students can share reviewed progress summaries with a verified guardian. The summary includes the actual guardian-link ID so child selection is preserved.
- Invoice TypeScript definitions now include the sponsor fields deployed in PR98, fixing a finance-screen type mismatch.

## Deployment and remaining boundaries

Migrations 20261026075253 and 20261026075353 were rollback-rehearsed on the live UniPathway database, checked for anonymous/raw write access and applied with ledger entries. No live family links or learning plans existed at activation and no fictional operational records were inserted. Existing academic roles and module/enrolment assignments determine access.

Official released assessment results/IQA, provider invitations, external messaging, sponsor claims/reconciliation, SCORM/LTI and offline content acceptance remain separate work. This activates formative tuition and scoped family services; it does not claim all LMS gaps are closed. Real staff/learner/parent account acceptance is still required before operational onboarding.

## Validation

- 35 formative-tuition database checks plus 23 legacy-guardian permission, revocation, retry, tenant and PKT timetable checks passed.
- 38 focused UI/unit checks passed; an additional selected-child learning-summary test passed.
- Application TypeScript and production build passed.
- 190-migration synthetic schema rehearsal passed, with provider extensions deferred as documented in the staging workflow.
- Live grant checks: anonymous activity execution false, authenticated activity execution true, raw consent SELECT false, direct learning-attempt UPDATE false.
