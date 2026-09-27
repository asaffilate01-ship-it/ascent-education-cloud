# Production Go-Live Checklist

## Security
- [ ] Rotate any credentials that have ever been committed to Git.
- [ ] Confirm production secrets are configured only in the deployment/Supabase secret stores.
- [ ] Audit RLS on every tenant/student/agent/academic/finance table.
- [ ] Verify tenant isolation with negative tests.
- [ ] Require MFA for privileged staff roles.
- [ ] Confirm sensitive identity/biometric documents use private storage and signed URLs.
- [ ] Review audit logs for grade, assessment, payment, identity and permission changes.

## Academic integrity and QA
- [ ] Enforce assessor -> IQA -> approved -> released state transitions server-side.
- [ ] Prevent an assessor from IQA-verifying their own decisions.
- [ ] Test moderation sampling and external-verifier read-only access.
- [ ] Verify immutable/versioned assessment and grade history.
- [ ] Configure real OTHM/Qualifi/IAB programme, unit and entry-rule data.

## Admissions and identity
- [ ] E2E test application -> documents -> eligibility -> identity -> offer -> payment -> enrolment.
- [ ] Test CNIC/NICOP/passport/selfie workflows and manual-review fallback.
- [ ] Test duplicate applicant/agent lead detection.
- [ ] Verify conditional/unconditional offer rules.

## Finance
- [ ] Configure live payment provider(s).
- [ ] Verify webhook signatures and idempotency.
- [ ] Test success, failure, retry, refund and reconciliation.
- [ ] Test instalment schedules, overdue reminders and agent commission triggers.

## Teaching
- [ ] Production-test live classroom provider, reconnection and recordings.
- [ ] Verify attendance events and lecturer overrides.
- [ ] Verify assignment submission, deadline, late submission, marking and resubmission.
- [ ] Load-test expected concurrent student usage.

## Progression and careers
- [ ] Configure partner universities/programmes and current entry requirements.
- [ ] Verify referral/partner codes survive the full application lifecycle.
- [ ] Test application export/API, offer tracking and commission reconciliation.
- [ ] Ensure visa/progression wording does not imply guaranteed admission or visas.

## Reliability and operations
- [ ] Enable error tracking, uptime monitoring and alerting.
- [ ] Enable database PITR/backups and storage backups.
- [ ] Perform and document a restore test.
- [ ] Configure rate limits and abuse protection.
- [ ] Confirm email/SMS/push queues, retries and delivery logs.
- [ ] Run accessibility and responsive-device checks.

## Automated release gates
- [ ] Unit/component tests for critical business rules.
- [ ] Playwright: applicant enrolment journey.
- [ ] Playwright: agent referral/commission journey.
- [ ] Playwright: student learning/assignment journey.
- [ ] Playwright: lecturer marking/IQA journey.
- [ ] Playwright: exam identity/admission journey.
- [ ] Playwright: university progression journey.
- [ ] Playwright: payment/reconciliation journey.
- [ ] Playwright: cross-tenant access must fail.
- [ ] Build, lint and tests must pass before production deploy.
