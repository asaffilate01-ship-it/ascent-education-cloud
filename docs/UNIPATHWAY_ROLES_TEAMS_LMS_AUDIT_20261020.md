# UniPathway roles, dashboards, Microsoft Teams and LMS audit — 20 October 2026

## Scope / non-claims
Connected GitHub repository `asaffilate01-ship-it/ascent-education-cloud` and Lovable project `2c97a03a-f146-4ff5-a22b-3765cf2f538f`. Evidence is SQL metadata, role tests via database helper, source inspection and PR #47. This is **not** an authenticated login-per-role acceptance test, migration parity test, external Microsoft tenant audit, Graph integration test, or production functionality certification. No demo passwords were collected or reset.

**Risk posture: RED / no private academic pilot until gate closures.** The public marketing site can be separately assessed, but private dashboards and integrations are not currently validated end-to-end.

## Verified live database findings
- 57 public tables, all RLS-enabled. This alone does not prove safe permissions.
- 153 policies after applying the existing, reviewed `20261018190000_unipathway_role_referral_rls_hotfix.sql` to live Supabase. Verified the blanket university-partner referral SELECT policy is absent and self-service role INSERT permits `student` only; all three signup/auth functions now default to Student, regardless of editable account metadata.
- Migration registry lists **only four** versions: `20260813103749`, `20260816114159`, `20260929181505`, `20260929181522`. There is no evidence it records the ad-hoc applied hotfix or the extensive GitHub academic/Teams migrations. Log and reconcile this drift.
- 17 development accounts exist: the 16 specifically requested plus parent/guardian. Exactly 3 specialist accounts (assessor, EQA, welfare) have profile tenant aligned with assigned role tenant. **13** other non-superadmin accounts have tenant-scoped roles but no profile tenant. The global superadmin role has no profile tenant by design, but privileged operations need an explicit centre scope.
- Calling the database `has_role(user_id, assigned_role)` helper as a diagnostic reports false for those 13 unmapped accounts, true for assessor/EQA/welfare and true for superadmin. This diagnoses provisioning; it does NOT simulate logged-in end-user sessions.
- Only 5 programme rows; 0 enrolled students, 0 assignments, 0 invoices, 0 referral_income, 0 health records. No conclusion about other tables' content.
- The *separately named* staging Lovable project's connected database currently has 0 public tables and 0 dev auth users. It is not a ready-to-test schema clone.
- Live Storage buckets: `avatars` and `resources` are **public**; `kyc-documents` and `submissions` are **private**. `MessagingInbox` uploads attachments into the public `resources` bucket. Use a private messaging attachment store with participant checks before sharing confidential documents.

## Requested role matrix: role exists does not mean workflow works

| Role / dev identity | DB role recognised | Route | Evidence and unresolved gate |
|---|---|---|---|
| Super Admin — dev.superadmin | YES (global) | /landlord | Portal routes and legacy data exist; privileged tenant scoping, activity audit and migration parity still needed. |
| Centre Director — dev.director | NO (tenant mismatch) | /director | Cannot reliably access tenant-scoped data; broad dashboard and operator actions unverified. |
| Admissions — dev.admissions | NO | /admissions | CRM source exists; missing newer international workflow tables and authenticated journey tests. |
| Lecturer — dev.lecturer | NO | /lecturer | Module/attendance/marking pages exist; assigned-module fallback removed in PR #47; no Teams Graph tenant provisioning. |
| Programme Leader — dev.programme | NO | /programme | Curriculum and schedules exist in source; provider/centre permissions, moderation and evidence not end-to-end tested. |
| QA / IQA — dev.qa | NO | /qa | Review details and paging work in previous component tests; sampling, release workflow and evidence pack integration incomplete. |
| Exams — dev.exams | NO | /exams | Genuine calendar read exists; seating, incidents, attendance/entry and verified results not persistent. |
| Finance — dev.finance | NO | /finance | Invoices and Stripe calls in source; institutional payment settlement/refund/reconciliation not verified. |
| Marketing — dev.marketing | NO | /marketing | Campaign draft download exists; no verified send/schedule, email/provider or delivery-rate integration. |
| Agent — dev.agent | NO | /agent | CRM and resources; self-registration to agent now blocked, authorised onboarding and role mapping required. |
| Student — dev.student | NO | /student | Portal exists; no enrolled-student fixture, no live classroom invite, storage/material/grade acceptance. |
| University Partner — dev.unipartner | NO | /partner | All-referral exposure hotfix removed; institution-specific membership and approved referral visibility remain unimplemented. |
| Employer Partner — dev.employer | NO | /employer | Employer-vacancy tables and organisation verification code have schema gaps. Legacy `job_listings` ALL policy is not employer-specific. |
| Assessor — dev.asses | YES | /assessor | Queue source exists; `submission_attempts`/`assessor_decisions` are absent from live DB. No marker allocation tests. |
| Awarding Body / EQA — dev.eqa | YES | /eqa | Portal read-only; explicit centre, qualification and assigned evidence-sample grants missing live. |
| Welfare — dev.welf | YES | /health | Generic protected route and no `welfare_officer` health-record SELECT policy: no validated welfare workflow. |
| Parent / Guardian — dev.parent (extra) | NO | /parent | Approved linked-child visibility and messaging need authenticated checks; no live linked-child fixtures. |

**Do not enable privileged demo roles on the public production tenant with shared/reset passwords.** Use isolated seeded staging credentials and real separate tenant users. Fix only intended test identities after authentication and a reversible fixture plan.

## High-priority security & correctness gaps
1. **P0 live fixed:** university-partner referral blanket SELECT and self-assigned Agent role. Confirmed corrected in live policy/function metadata, but hotfix isn't in live migration registry.
2. **P0 pending:** legacy employer ALL policy on `job_listings` allows any `employer_partner` to manage entries without institution-specific ownership or tenant condition. Fail closed and introduce a verified employer membership relationship before permitting writes.
3. **P0 pending:** `conversation_participants` permits self-enrolment in any known same-tenant conversation ID. Needs a server-verified invitation and recipient consent mechanism; do not treat obscurity of UUID as authorization.
4. **P0 pending:** client-facing submissions contain provisional grade and feedback columns. Student-owned row SELECT alone cannot protect those *columns* until explicit results release. Move controlled marking into a private assessment store or a secure authorised endpoint; rework student reads and remove direct provisional score exposure.
5. **P1 pending:** same-tenant access alone cannot grant viewing all lesson recordings, materials, whiteboards or staff gradebooks. PR #47 proposes row-specific classroom invitations, enrolments, release states and private media. Not installed or proven in production.
6. **P1 pending:** generic `/health` uses login-only route guard; welfare role is not authorised to read records in live RLS. Design case/assigned student access, emergency break-glass logging and minimum necessary health data.
7. **P1 pending:** public `resources` bucket is used for messaging attachments; must move confidential messaging to private storage.
8. **P1 pending:** 13 tenant-invalid test accounts; no actual role browser/mobile/storage negative tests, despite valid role strings and many routes.
9. **P1 pending:** many sidebar paths reuse one dashboard; source routing does not prove each action is separately implemented.
10. **CI blocker:** PR #47 initially failed before any tests: `npm ci` rejected package-lock drift; missing Drizzle ORM/kit, postgres, esbuild transitive entries. Regenerate `package-lock.json` with the package manager, commit, then rerun all gates. Do not replace deterministic CI with `npm install` as a workaround.

## Teams Enterprise target model and Microsoft service boundaries
- **Staff:** licensed Microsoft Teams organiser identities in a verified Microsoft 365/Entra tenant. Admin consent and app access policy for Graph, compliant meeting policies including lobby, presenter, recording and transcripts, retention and institutional privacy.
- **Student:** authenticated UniPathway student, active enrolled programme, invitation to a specific class session and provider lobby admission. Do not rely on a leaked join link as a permission boundary.
- **White label:** UniPathway navigation, branding, access, materials and records; ACS Calling/UI SDK can support a custom video interface for Teams interop subject to Microsoft policy, capacity and feature limits. Native Teams itself is not a fully white-label embeddable application; Teams PowerPoint Live, some whiteboard, polls, breakout, reactions and recordings need dedicated UniPathway or Teams-native flows and tests.
- **Meeting lifecycle:** create a calendar-backed Teams event/meeting as organiser so later recordings/transcripts can be retrieved through the supported Microsoft Graph endpoints. Standalone `onlineMeetings` are not sufficient for all recording/transcript APIs.
- **Recording:** recording-enabled flag is **not** recording proof. Verify recording policy, attendee notification/consent, Graph recording metadata and blob retrieval, malware scanning, human academic review, publication status, private bucket, 120-second signed download and tenant+session+invitation checks. Detect failure/missing recording explicitly.
- **Materials:** programme -> module -> assigned lecturer -> teaching material (draft/published, private storage) -> active enrolments. Remote file references never serve as direct public permanent URLs.
- **Assessment:** enrolled learner submits own task; assigned marker evaluates privately; AI guidance is a draft not a decision; assessor declaration and IQA moderation; quality or authorised director releases immutable final results. Student sees marks only after final release; EQA receives explicitly assigned samples.
- **Role gates:** frontend RoleGuard is necessary navigation only; policies/RPCs/storage/Graph credentials enforce access server-side. Each role must have a positive test, wrong-user test, cross-tenant negative, stale enrolment negative, revoked invite negative and signed media expiry check.
- **Scale:** 50–100 learners/cohort, separate session-specific invite lists; conferencing participant limits and service cost need validated capacity forecasts.

Microsoft primary guidance: https://learn.microsoft.com/en-us/azure/communication-services/concepts/join-teams-meeting ; https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0 ; https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-recordings?view=graph-rest-1.0

## PR #47 implementation (source / migration proposal, not live)
- New `live_class_invitations` and explicit EQA/IQA/assessor evidence grants, enrolment-gated class RLS and replacement of permissive same-tenant read policies.
- `live_class_artifacts.publication_status` (draft by default), gated whiteboards, approved lesson packs and private class/media storage with short-lived download links.
- New private `unipathway_module_materials` uploads and academic publishing flow; server role and module RLS; enrolled students see published materials.
- Lecturer Teams-link timetable and per-course invitations, class visibility/errors and class launch linked to confirmed provider meeting.
- Curriculum fallback bug fixed: lecturer no longer sees arbitrary six modules when unassigned. Student assignment zero scores no longer disappear due truthiness.
- Unit/static security contracts added. No claims of live ACS room, Graph meeting creation, recording transport, or cleared browser/RLS suite.

## Release gates (all required; no production classroom publish)
1. Reconcile **all** source migrations into an isolated working staging database, seed two distinct tenants and all 17 roles with controlled non-production credentials. Confirm migration IDs on target and backup/rollback.
2. Apply role and RLS fixes in staging, test 17× permitted/prohibited API actions, safe parent links, employer/referral samples, audit logging, blocked signup role escalation and Storage policies. Resolve student provisional-grade exposure and conversation participation.
3. Repair npm lock drift; pass `npm ci`, typecheck, lint, build, Vitest, PGlite fixtures, Deno Edge Functions and browser E2E (desktop+mobile) on the exact head SHA.
4. Configure Microsoft 365 tenant and verified domain, Teams/Entra licensing, Graph app permissions/admin consent, app access policies, ACS resource, recording/transcription/retention/lobby/attendance policies. Never store Microsoft user passwords in UniPathway.
5. Implement and verify calendar meeting creation/change/cancellation, invite notifications, classroom rendering, presentation/whiteboard, recording webhook or polling ingestion, short-lived media access, signed auditable grade release.
6. Pilot with real consented test staff and students. Test live join, invitation revocation, unauthorized observers, recording failure, late join, accessibility, mobile and cross-tenant separation. Only then merge and publish to production.

