# Guided audio and dashboard pass — 24 October 2026

## Implemented

IELTS Academy now includes a tutor-led audio panel. It lists up to 100 upcoming invited classes through existing class RLS. Authorised tutors upload licensed audio (up to 50 MB) to a private class-scoped bucket and issue revision-checked play, pause and reset commands. Learners explicitly enable audio, keep individual volume control and may leave. No microphone is activated. Class state is polled every three seconds with a server-time anchor; access failures stop playback and a ten-second timeout prevents a stalled check from leaving playback running indefinitely. Signed links expire after 90 seconds and are refreshed while access remains valid. Already delivered/buffered media cannot be recalled.

This is guided practice with approximate synchronisation, not exam enforcement or a conferencing service. Live pair/group conversations and tutor voice intercom still require the Microsoft/media-provider implementation and acceptance. The existing private Speaking studio remains the submission/review route. This pass does not promise unlimited live capacity.

Migration `20261024061346_unipathway_guided_audio.sql` adds class state, a private bucket and invitation/manager policies. Its invoker RPCs enforce access, validate stored objects and reject stale revisions. It also explicitly grants SELECT on the existing module-material metadata table: Storage's existing policy references that table, so missing privileges otherwise block object reads even for unrelated buckets. Existing published/enrolled-material RLS is retained. The offline harness now models Storage API table privileges explicitly; it is still synthetic and cannot prove hosted signed-URL transport.

## Dashboard changes and remaining work

| Role | This pass / existing foundation | Remaining |
|---|---|---|
| Student | Homepage uses published assessment briefs and own attempts, shows requested resubmissions, overdue/closed windows and next invited classes; removes legacy task feed; grades retry and identity reset | Real hosted learner journey, full mobile/accessibility acceptance, provider-ready join status |
| Lecturer | Assigned modules only, explicit empty/error/retry states, working timetable link | Measured student workload/attendance metrics, recording lifecycle and provider acceptance |
| Parent | Account/tenant/role switches remount result view; existing verified learner-consented results retained | Separately authorised attendance/finance/timetable scopes and recipient-consented staff messaging |
| Centre director / admin | Count unique actively enrolled learners; don't offset one invoice debt with another's overpayment; duplicate College Dashboard uses maintained director view | Staff invitation lifecycle, actionable operational queues and authenticated centre acceptance |
| Super admin / landlord | Remove fabricated uptime and all-systems/compliance claims; platform query failures are explicit; service readiness marked unverified | Measured monitoring, centre selection for global operators, verified subscription provisioning and aggregate reconciliation |
| Programme leader | Existing curriculum/assessment/appeal routes | Assigned programme workflow and schedule acceptance |
| Assessor | Existing independent queue and decisions | Hosted allocation, evidence and resubmission acceptance |
| IQA / QA | Existing approval/release and appeal workflows | Sampling, evidence exports and complete QA route-specific operations |
| Exams | Existing schedule reads | Persisted room/seating/entry/incident workflows and results verification |
| Admissions | Existing transactional enrolment handover | Full authenticated application-to-learning acceptance |
| Finance | Existing invoice-success reconciliation and payment ledger view | Manual payment integrity, verification, refunds and provider acceptance |
| Marketing | Existing campaign workspaces | Authorised send/schedule and delivery receipts |
| Agent | Existing CRM/resources | Approved onboarding and role/tenant mapping acceptance |
| University partner | Existing partner/referral foundations | Assigned institutional membership and referral acceptance |
| Employer partner | Existing verified-employer foundations | Vacancy/candidate ownership and workflow acceptance |
| Awarding body / EQA | Existing explicit evidence-grant model | Hosted assigned-sample acceptance |
| Welfare | Existing workspace | Purpose-limited case assignment, access audit and escalation workflow |

## Validation and source merge boundary

401 app tests in 89 files passed. Nine earlier individual-audio tests remain in that suite; this pass adds eight guided-audio tests, four agenda tests and four dashboard regression tests. TypeScript and production build passed. Full reviewed fresh-schema rehearsal passed 166 migrations with the provider-extension migration deferred, including 22 new guided-audio permission, object-access, conflict and revocation checks. Existing identity, guardian, admission and Stripe checks also pass. Targeted lint has no errors; legacy any/ref warnings remain.

The user requested source commit, push and merge on 24 October. That authorises source integration after CI, not production migration, provider purchases or publishing. Earlier notes saying keep the PR draft until hosted acceptance describe the previous integration policy; hosted acceptance is still a deployment gate. No hosted SQL, provider resource, account provisioning or publishing was performed in this increment.

Staging source/configuration recovery and migration parity remain outstanding. Apply the reviewed fresh-staging baseline only to an independently verified isolated target. Existing broken historical migrations are not made safe for direct production replay by this merge. Test actual Storage delivery, invite revocation, two devices following playback, 20 headsets, reconnects and increasing remote loads before activating.
