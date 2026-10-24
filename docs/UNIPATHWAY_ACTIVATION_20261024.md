# Activation and delivery status — 24 October 2026

## Implemented in this change

- Private PDF, DOCX, JPG and PNG evidence in independent coursework; five files per attempt, 20 MB per file. Native camera capture feeds the same explicit upload flow. Written evidence remains mandatory. Student, allocated assessor, IQA and authorised appeal review screens use the same access-controlled manifest.
- Atomic submission attaches completed uploads and an idempotency key. Upload metadata must match the stored object. Final evidence cannot be overwritten or deleted by application users. Storage mutations lock the manifest to serialize against submission.
- Platform administrators save and restore centre setup drafts, including document references. Optimistic revision checks prevent stale overwrites; centre creation and setup details commit together. Administrator invitation retries use the existing invitation service and the same centre ID.
- Module links retain context across classes, library, recordings, assignments and released results. Course status no longer presents archived modules as learner achievement.
- Public qualification details can be reviewed under Landlord → Production Readiness → Public course details. Approval requires fee/currency text, entry requirements, a future intake, evidence reference and expiry within 180 days. Draft, expired and withdrawn offers are not public. Reviews are immutable audit snapshots. No business facts were invented or published.
- Current-identity RLS helper fixes policies calling a revoked internal helper without reopening arbitrary-user tenant lookup.

## Hosted inspection and blocker

Lovable project `2c97a03a-f146-4ff5-a22b-3765cf2f538f` reports an enabled Supabase database. Read-only inspection on 24 October returned these four migration versions:

- `20260813103749`
- `20260816114159`
- `20260929181505`
- `20260929181522`

The inspected database has no `unipathway_assessment_briefs`, `live_class_sessions`, `unipathway_account_invitations` or `unipathway_coursework_uploads`. This is not a target that can accept only the new coursework migration. Supabase Edge Function listing for project `sthrhcmjypwuorlbscfw` returned “You do not have permission to perform this action”. No hosted SQL writes, function deployment, recording transfer or native store upload were performed in this change.

Do not replay the full historical migrations against this populated database, mark unapplied versions as applied, or use the fresh-empty-staging bundle as a production upgrade. First export the hosted schema and migration history, reconcile existing objects against the reviewed source in an isolated database, rehearse a forward-only delta, then apply that delta through a project administrator. Confirm target identity against `.env.production` and take a recoverable backup before the upgrade. The existing manual staging bootstrap deliberately rejects non-empty targets.

After reconciliation, deploy the matching Edge Functions, inspect private buckets and policies, regenerate database types, and run the existing authenticated two-tenant staging workflows. Publish only after those hosted checks succeed. A merged frontend or offline schema test is not hosted acceptance.

## New migrations

1. `20261024170508_coursework_evidence_and_onboarding_recovery.sql`
2. `20261024171611_current_identity_policy_helper.sql`
3. `20261024171828_verified_course_offers.sql`

These depend on the earlier independent-assessment, appeals, account-invitation, centre-onboarding and storage baseline. Full fresh-schema rehearsal includes the new access/retry/content checks; it uses synthetic Auth/Storage and defers provider-owned extensions.

## Remaining provider and operational acceptance

| Area | Existing implementation / local verification | Required live evidence |
| --- | --- | --- |
| Invitations/import/enrolment | Existing invitation completion is idempotent; import parser and enrolment handover database fixtures; new durable centre recovery | Email delivery, expired-invite recovery, duplicate CSV re-import and enrolled-account sign-in on the reconciled backend |
| Teams and lab | Existing organisers, group plans, guided audio and recording-worker fixtures | Microsoft application consent and organiser accounts/licences; deploy scheduled worker using documented environment keys; run in-person and remote class, actual Teams breakout controls, capture, transfer, staff release and student playback |
| Assessment | Existing independent-assessment suite exercises marking, human confirmation, IQA, release and appeal; new file access checks | Approved syllabus, rubric and policy for each actual programme, named assessors/IQA and hosted journey evidence. Generic fixtures do not certify awarding-body approval |
| Mobile | Android/iOS projects, secure auth, camera/upload, Teams handoff, push provider code and build workflows | Apple/Google developer accounts, signing assets and identifiers; real-device PKCE/recovery, camera, failed-upload retry, Teams handoff, notification receipt; signed TestFlight/Play internal uploads |
| Public offers | Review, audit, expiry and public display workflow | Actual approved availability, fees/currency/inclusions, entry requirements and intake dates supplied by admissions |

Private teacher-to-student intercom remains separate work. Saved group plans do not execute Teams breakout or microphone commands. A recording preference does not prove a recording exists. Push provider acceptance does not prove device receipt.
