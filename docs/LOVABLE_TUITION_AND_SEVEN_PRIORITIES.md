# Lovable handover: personalised tuition and the seven delivery priorities

No production changes are authorised by this file alone. The user has asked to build/merge now and activate later when they have Lovable credits. No live SQL, secrets, provider messages or store uploads were performed for this build.

## Paste into Lovable when ready

> Sync this UniPathway project with the current GitHub main branch, including PR59 and the personalised tuition changes. Read AGENTS.md, docs/UNIPATHWAY_ACTIVATION_20261024.md and this handover first. Preserve UniPathway, STEMCoach and Ilmvero brand separation, existing Teams classrooms, independent marking/IQA and private storage.
>
> First confirm which Supabase project is actually used by the website and compare it with .env.production. Run docs/activation/unipathway-preflight.sql and report missing objects. The earlier inspected backend contained only four historical migration records and lacked current assessment/Teams tables. Do not replay historical SQL blindly, use the fresh-empty-staging bootstrap on a populated database, or mark missing migrations as applied. Export/backup the current schema and data, prepare a forward-only reconciliation against that baseline, and rehearse it in isolated staging before changing the hosted database.
>
> Reconcile all prerequisite migrations, including PR59's coursework/recovery/current-identity/public-offer migrations and 20261024184058_personalised_tuition_plans.sql. Deploy the matching required Edge Functions, verify Auth configuration and private bucket policies, regenerate database types, then run the role/tenant acceptance checks. Run each journey in the table below with authorised test accounts. Report evidence and genuine blockers, rather than substituting sample content or success messages. Publish only after the agreed hosted gates pass. Microsoft and mobile signing credentials must stay in server/protected environments, never in frontend variables or Git.

## What is newly wired

- Student `/student/learning-plan`: tutor-created diagnostic evidence, goal, ordered practice, help requests, response history and reviewed feedback. Suggested next activity prioritises an unresolved reviewed skill before new work; this is deterministic guidance, not an AI score.
- Lecturer `/lecturer/learning-plans`: active enrolled roster restricted to assigned modules, duplicate-safe plan creation, original practice authoring, help queue and immutable teaching reviews. Students in the same module can have different activities.
- Parent `/parent/learning`: per-plan, per-guardian opt-in summaries. Raw answers, diagnostic notes and tutor feedback are excluded. Revocation, guardian reverification and enrolment withdrawal remove access.
- Skill states: not assessed, needs support, demonstrated with hints, demonstrated independently. No invented mastery percentage, official grade, awarding-body approval or guaranteed outcome.
- Android distribution signing configuration and manual protected-environment bundle workflow. CI uses a disposable test certificate only. iOS push entitlements and signing/export preparation script are included. Neither store is contacted automatically.

## Seven priorities: acceptance required

| Priority | Source implementation | Hosted/operator acceptance |
| --- | --- | --- |
| 1 Hosted activation | Read-only preflight SQL; existing schema rehearsal, function wiring audit and staging workflows | Verify target, backups, reconciled schema, functions, Auth, Storage/RLS, then latest website release. Object existence is not runtime acceptance. |
| 2 Coursework uploads | PR59 private PDF/DOCX/JPG/PNG uploads, native camera capture, retry-safe submission, assessor/IQA/appeal access | Upload on desktop/Android/iOS; interrupted upload and retry; peer/cross-tenant denial; no overwrite/delete after submission; download as assigned reviewer. |
| 3 Admin recovery | PR59 durable drafts, older incomplete-centre recovery, atomic centre creation, existing invitation/import/handover services | Resume from another session; stale revision rejection; invite existing/new account; confirm email delivery; retry duplicate CSV; complete application-to-enrolment handover without duplicates. |
| 4 Connected flow | PR59 student/lecturer module links plus new individual tuition plans | Follow a real course to class, resources, released recording, practice, assignment and released result; verify mobile navigation and empty/error states. |
| 5 Teams and lab | Existing organiser/group-plan/guided-audio/recording-worker source | Microsoft consent, organisers/licences, actual meeting limits; supervised server recording worker; in-centre and remote join; actual group activity; capture, transfer, staff release and learner playback. Private intercom remains separate; saved group plans do not operate Teams breakout rooms. |
| 6 Academic acceptance | Existing independent assessment/IQA/appeal DB tests; new formative-tuition access tests | For every offered programme, use approved syllabus, versioned rubric, named independent marker and IQA. Demonstrate syllabus→brief→submission→AI advisory if configured→human mark→IQA→release→appeal. Never treat practice feedback or generic fixtures as board acceptance. |
| 7 Mobile release | Secure auth, camera/upload, Teams handoff, push workers; native CI; release signing preparation | Developer accounts, production identifiers, Firebase/APNs, signing assets; real-device PKCE/recovery/logout, camera/upload retry, Teams return and notification receipt; then signed TestFlight/Play internal releases. Lovable web publishing does not perform these store steps. |

## Microsoft recording and notification workers

Use the existing server scripts `scripts/teams-recording-worker.mjs` and `scripts/native-push-worker.mjs`. They are server processes, not frontend features. Configure the documented required environment variables on a supervised worker host. Never paste service-role or Microsoft client secrets into VITE variables. Verify organiser meeting ownership, approved Microsoft application access, recording completion, private transfer and staff release with a real class. Record job IDs/statuses without credentials or student media in public logs.

## Academic evidence to supply

For each offered OTHM, Qualifi, ATHE, tuition board, IELTS or vocational programme: curriculum/specification reference and version; authorisation where required; assessment/resubmission/appeal rules; rubric; assigned teaching/marking/IQA roles; and a hosted acceptance record. The software supports a workflow; it does not create delivery permission. Public qualification offers are edited in Landlord → Production Readiness → Public course details. Admissions must supply actual availability, fee currency/inclusions, entry requirements and intake dates.

## Native distribution preparation

Android: configure protected GitHub environment `unipathway-mobile-release` and required secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_SERVICES_JSON_BASE64`. Restrict environment deployments to reviewed main. Run **Prepare signed Android testing bundle** with an increasing build number, semantic version and real-device acceptance evidence URL. Download the signed AAB and upload to Google Play internal testing using the authorised account. Confirm package `pk.edu.unipathway.app`, upload-key ownership and Play App Signing before first upload. The workflow does not publish or claim store approval.

Do not distribute the ephemeral CI test-key bundle. CI publishes only its debug APK and simulator application as before.

iOS: on the authorised Mac install the distribution certificate/private key and App Store Connect provisioning profile for `pk.edu.unipathway.app`, with Push Notifications enabled. Ensure the app record and developer team exist. Set `APPLE_TEAM_ID`, `APPLE_PROFILE_NAME`, `UNIPATHWAY_BUILD_NUMBER`, `UNIPATHWAY_VERSION_NAME`, `DEVICE_ACCEPTANCE_URL` and `RELEASE_ACK=DEVICE_ACCEPTANCE_COMPLETE`. Create `mobile-release` if needed, then run `node scripts/release/prepare-ios-release.mjs`. The script archives/exports locally; validate and upload with Xcode or Transporter, then assign TestFlight testers. Signing/export remains unverified until real assets are supplied.

## Cross-brand boundary

This implementation is in the UniPathway repository. It does not modify or deploy STEMCoach, Skillfinch or TrainDirekt. Reuse the learning workflow through separately reviewed implementations/connectors with brand-specific curricula, permissions and consent. No shared learner identity or automatic data transfer has been assumed.

## Worker-host deployment preparation

Reviewed systemd services/timers and offline configuration validation are now in `deploy/workers/README.md`. They schedule the existing recording and notification workers with non-overlapping runs, deadlines and filesystem restrictions. `npm run test:worker-operations` tests configuration rejection and offline CLI behaviour. No host has been provisioned or timer activated; Microsoft/FCM/APNs connectivity and device receipt still require live acceptance.

## Connected module overview (next source phase)

Student `/student/module?module=<id>` and lecturer `/lecturer/module?module=<id>` now consolidate the next five classes, up to five assessments prioritising open work needing a submission, resources, individual practice and student released-result counts. Enter through module titles on the dashboards/course list or the Overview link in module navigation. Each panel has its own unavailable state; failed queries do not become zero counts. No provisional marks or private answer text is fetched for the summary. Opening a tool rechecks its existing authorisation.

The student library reads all permitted metadata in ordered batches, with bounded ID filters, and displays 20 resources per page. This removes the old 500-material/session/artifact cap. Private files are still fetched only on request using short-lived links. No new database migration or provider configuration is introduced by this phase; prior schema activation remains required.

Hosted acceptance: open the same module as its enrolled learner and assigned lecturer; verify the correct classes, published briefs and resource releases; withdraw enrolment/reassign teaching and refresh; confirm no module detail is shown. Test a centre with over 500 materials/classes and search for an older released resource. Interrupt one panel request and verify an explicit error while the other panels remain usable. Check phone-width layout and navigation back to all courses/teaching. A passed source test does not replace this hosted acceptance.

## Complete assessment histories and appeal corrections

Student coursework and released results now read all authorised rows in ordered pages, with ID filters capped at 50 per request. Results and amendments use their actual unique `attempt_id` key. Search covers the complete loaded history; coursework displays 10 assessments per page and results 20. Module-filtered coursework reads only that module's enrolled briefs. A refresh or failed dependent request hides the old snapshot; requests from an earlier account/module cannot replace the current snapshot. Draft coursework remains in memory during refresh, search and page changes, but is not an offline/saved draft service.

Coursework now applies the independently approved appeal amendment to the displayed score, raw score and feedback, matching the results page. It preserves the original released score and a link to the appeal decision. If amendment verification fails, the page does not fall back to an uncorrected score. Original release rows, marking, IQA and appeal permissions are unchanged. No new migration is needed for this source phase.

Hosted acceptance: use a student with more than 250 submissions/results, find an older assessment, verify its attempt history, attachments and approved feedback, then verify an approved appeal amendment on both coursework and results. Interrupt a later page or amendment request and confirm that partial/original scores are hidden until a successful refresh. Switch accounts/modules during a slow request and verify no previous account's records appear. Follow the independent appeal and resubmission journey under the programme's approved policy; this UI work does not certify programme or awarding-body acceptance.

Original written submissions can now be reopened with **Read submitted response**. The body is requested only on demand, scoped to the current student/centre/attempt and checked by RLS. Hiding it clears the displayed body; reopening performs a fresh read. It is never an editable draft. Verify this alongside attachment access and denial after access changes.

## Guardian conversation recovery and support desk

Apply `20261024195639_guardian_message_recovery.sql` through the reviewed hosted reconciliation before activating this UI. It adds an optional message request UUID, an author/request unique index and `send_unipathway_guardian_message_once(uuid,text,uuid)`. The new endpoint rechecks guardian/staff permission even on retries, serialises with the existing author rate-limit lock, and locks the guardian link against concurrent consent/reverification changes. Exact retries return the original message ID without creating another row or consuming another rate-limit slot. Reusing the request for another body is rejected. Existing clients retain the legacy sender; the new UI deliberately does not fall back to it.

Within an open conversation page, uncertain sends retain the request and freeze its text. **Retry same message** resubmits that request; **Refresh conversation** checks whether it already arrived. **Clear draft** clears the local pending text, never deletes an already saved message. Pending requests are not persisted across browser reloads: keep the page open until delivery is confirmed. No email/SMS/push notifications are added by this phase.

Conversation history now reads all currently permitted messages in ordered batches, with search and 20-message display pages. Failed refreshes clear the old history. The guardian support desk has queue loading, refresh/retry, search and empty states; losing an authorised link closes its conversation. The parent overview and learning progress page share navigation, including Learning plans. Attendance, schedules, results, practice and communication still have separate permissions.

Hosted acceptance: simulate a lost send acknowledgement, retry unchanged and verify one message; verify refresh reconciles the saved request. Revoke communication or reverify the link and confirm the parent cannot read or retry it. Check assigned staff, unassigned lecturer, learner, peer, other-centre and anonymous scopes. Search an older message beyond 100 records, test support-desk recovery, and follow Learning plans from the parent overview. Offline tests do not prove live provider delivery or complete hosted acceptance.

## Account import and invitation recovery

Account operations now load the centre-scoped invitation ledger in complete ordered pages, with search, refresh and explicit unavailable states. Prepared requests can be loaded for review; loading does not send an invitation. Centre administrator recovery remains in centre setup. Recorded assignments are historical outcomes, not proof of current access or email delivery.

Imports support pause after the current request, resume pending rows and skip individual rows. Any unconfirmed outcome stops further requests. Changing account/centre or leaving the page stops the remaining batch; an already issued request cannot be cancelled. Unsent CSV rows and skip choices remain in memory only: keep the page open or re-upload the CSV after reload. Retries use the existing server-side identity and role deduplication.

Account operations, the staff modal and centre setup now require a recognised server outcome with consistent email-issue metadata before reporting success. Structured provider errors are surfaced; a generic HTTP acknowledgement is insufficient. No new migration, function deployment or real invitation was performed in this phase.

Hosted acceptance: with approved test recipients, interrupt an invitation acknowledgement, review the saved ledger and retry the same identity/role. Verify no duplicate access assignment, correct email-issue reporting, provider rate-limit pause, skip/resume, account-switch isolation and recovery after reload. Test centre setup completion and enrolment handover separately; imports still do not enrol learners. Actual delivery and expired-invite recovery remain live acceptance gates.

## Coursework attachment operation recovery

Attachment selection and requests are now scoped to the signed-in account, centre, brief and submitted attempt. Leaving or switching scope stops subsequent client operations and ignores late results; an upload/removal already sent to Storage cannot be recalled. Late downloads do not open after leaving the evidence screen. Native camera results from the previous attachment workspace are ignored.

Uploading or removing a file blocks submission until the refreshed attachment manifest is successfully read. Failed refreshes remain blocked with an explicit retry; null/malformed responses are not treated as an empty list. Existing storage policies and submission validation still decide whether evidence exists and is permitted. This phase adds no migrations or hosted changes.

Hosted/device acceptance: delay reservation, upload and download responses while switching accounts/assignments; verify no old file selection or late download appears. Fail the post-upload list request and confirm submission stays blocked until refresh succeeds. Interrupt an actual native camera/upload, recover the reserved attachment list and verify the final submission and assessor download under current permissions. Local tests do not establish device or provider acceptance.

## Complete course-material history and recovery

Course materials now read all authorised modules, active enrolments and material metadata in ordered pages, with module ID filters bounded to 50. The former 300-resource cap is removed. Search includes title, module, type and publication status; 20 resources display per page. Refresh clears the old snapshot, and a failure on any page does not display a partial list. Student release timing and enrolment filtering remain in place alongside RLS.

Publishing and draft creation require a returned record before reporting completion. An uncertain response prompts refresh and review before retrying. Draft uploads are not automatically deleted on an uncertain metadata response, because that could remove a file whose metadata was saved. Interrupted uploads can leave a private unreferenced object requiring administrator reconciliation; automatic orphan cleanup is not added here. Account, role and module changes reset the workspace and suppress late actions/downloads.

Hosted acceptance: find materials older than the former cap; verify lecturer assignment and student enrolment/release timing; interrupt a later metadata page, then refresh; revoke publishing access and verify no success notification; interrupt a draft-save acknowledgement and inspect drafts before retrying. Verify a late private link does not open after account switching. No migration or hosted deployment is included.

## Student agenda recovery and task priorities

Coursework and invited classes now load independently: one unavailable panel does not hide verified records in the other. Refresh and account-scope changes clear both old snapshots; cancelled requests cannot restore them. Coursework queries use bounded module/brief filters and complete ordered pages. The most recent attempt determines whether a submission is still needed.

The agenda shows up to five open-window tasks first, with closed tasks in a separately labelled expandable section and links to the correct module coursework. Counts cover the complete permitted history, while the class list intentionally previews the next five invitations. Full coursework/class tools retain their own access checks. No migration or deployment is included.

Hosted acceptance: fail each panel independently, recover with refresh, switch accounts during a delayed request, and verify large enrolment histories. Check latest-attempt resubmission status, deadline/cutoff labels and module links against the actual programme rules. Open-window labels are a summary, not a guarantee that server submission rules will accept work.

## Lecturer attendance report recovery

The lecturer attendance report now loads only the lecturer's centre and assigned modules, with complete paginated mark reads and bounded learner-name queries. It has module filtering, full-history learner search, 20-row display pages and explicit refresh/recovery. A failed module, mark or name query hides the entire unverified snapshot. Account/role/centre changes reset the workspace. RLS remains authoritative.

Present, late, absent, excused and other marks are separate. The displayed rate is (present + late) / (present + late + absent), weighted across recorded marks; excused/other marks are excluded and an empty denominator displays Not available. This aligns with the existing recorded-attendance chart calculation. The report no longer invents risk or perfect-attendance classifications from incomplete/unmarked sessions.

The inactive Take Register button is replaced with View class invitations. This is a read-only report: manual register capture, live Teams presence and provider attendance reconciliation are not implemented by this phase. Hosted acceptance must verify assigned-module restrictions, reassignment, missing profiles, excused-only histories, large mark histories and failed-refresh recovery against approved centre attendance policies. No migration or deployment is included.

## Connected lecturer teaching workspace

The teaching page now links to module overviews, materials, class scheduling and invitations, with assigned-module search and display pagination. It no longer reads legacy assignment/submission counts. Its weekly plan shows all saved start times across seven days, effective dates and recurrence, with hours calculated from actual start/end durations. Conservative overlap warnings include date-window and time overlap; they still require human review of recurrence.

Shared scheduled-lecture reads now use complete ordered pagination, centre filtering and account-aware recovery through the existing query hook. Realtime refresh is centre-filtered. The teaching page and academic timeline hide unverified snapshots and offer refresh when their required reads fail.

The destructive Auto-Schedule All shortcut is removed from the teaching page: its existing database function deletes current-term module rows before recreating them. This phase does not alter or invoke that legacy function. Staff are directed to the existing invited-class scheduler for deliberate scheduling. Saved weekly plans are explicitly separate from Teams meetings, attendance and actual delivery.

Hosted acceptance: verify assigned modules and peer exclusion; inspect weekend/non-standard saved slots, durations and effective dates; follow module/material/scheduler links; interrupt schedule and timeline queries; switch accounts during reads. Confirm actual invitations and Teams delivery separately. Legacy recurring-plan editing/replacement needs a reviewed backend workflow before being exposed again. No migration or deployment is included.

## Daily manual register

Reconcile `20261024221712_unipathway_daily_register.sql` before activating Take daily register on lecturer attendance. It adds recorded author metadata, a daily-register unique key and authenticated roster/save RPCs. Each RPC checks the current assigned lecturer and centre role; save locks the module and active enrolment/profile while recording. Exact same-status retries return the original mark. A conflicting or historical mark is not overwritten; corrections require administrator review. Direct authenticated attendance INSERT/UPDATE/DELETE is revoked so clients cannot bypass the workflow. Review any external legacy client relying on those writes during hosted reconciliation. Historical rows remain untouched.

The screen requires an explicit per-learner mark, freezes uncertain choices for same-mark retry, refreshes saved state, and stops follow-up client work after scope changes. Module/date controls are disabled during a save. Clear pending choice discards only the local uncertainty and rechecks the roster; it never deletes a saved mark. Unsent choices are in-memory only. One daily mark per learner/module/date is intentional; this is not per-session attendance, a Teams presence import, or a correction workflow. The current active enrolment governs roster access, not a reconstructed historical roster. Dates cannot be in the future in Pakistan time.

Hosted acceptance: review advisors and direct-write compatibility, verify teacher/peer/student/other-centre scopes, simultaneous retries, revoked roles and enrolments, historical duplicates, and a lost acknowledgement. Confirm saved marks appear in lecturer/student reports and only separately consented parent views. No hosted migration, provider job or notification was run.

### Attendance correction requests and independent review (25 October 2026)

- Assigned lecturers can request a different mark from each saved daily-register entry, including historical marks. A 10–2,000 character reason is required. Requests do not change attendance until approved. Corrections address individual records; they do not merge or remove historical duplicates. The roster still uses current active programme enrolments, so withdrawn learners are not selectable there.
- New **Attendance corrections** links lead to lecturer, director and landlord routes. Lists include pending requests and searchable decision history, fetch every 100-row RPC page, and show 20 entries at a time. A failed page discards the partial history and offers refresh.
- Only a different centre director or super administrator with an explicit role in the same centre can approve or reject. Platform-wide superadmin status does not confer cross-centre review access. Admissions and programme-leader roles alone cannot review.
- Approval locks the saved record and request, verifies the original mark/module/student/date/method, then atomically updates the mark and decision. Rejection leaves the saved mark unchanged. Original/requested marks, reasons, requester/reviewer IDs and timestamps remain in the correction ledger. The original attendance author is retained.
- Request UUIDs and exact review payloads make retries idempotent; a partial unique index prevents two pending requests for one mark. The UI freezes uncertain details for an exact retry and points staff to refresh history. No direct client table access is granted to the ledger; RPCs check fresh database roles and centre membership. Existing attendance DML revocations remain.
- Reconcile `20261025060419_unipathway_attendance_corrections.sql` after the daily-register migration through the existing hosted activation process. Do not replay the full migration directory blindly. Preflight now checks all three correction RPC grants.
- Local Supabase advisors could not connect because no local Supabase server was running. Run hosted advisors after reconciliation and validate with distinct lecturer/director accounts: request → no report change → approve → refreshed lecturer/student/authorised-parent reports, reject → unchanged mark, self-review/cross-centre denial, repeated requests/decisions, stale mark rejection, refreshed history and account switching.
- This is code and offline acceptance only. No hosted migration, real invitation, Teams import, recording worker, push delivery or mobile store release was performed. Per-session Teams attendance and withdrawal/historical-roster administration remain separate work.
- Local validation: 533 frontend tests pass (including 8 new correction UI tests); 36 correction-specific database checks pass in the full 178-migration offline rehearsal, with 37 activation preflight checks. TypeScript, lint (existing warnings) and production build pass. Provider extension handling remains explicitly deferred in the offline rehearsal.

### Student attendance and guardian recovery bundle (25 October 2026)

1. **Student attendance history:** the student route now explicitly scopes every mark read to the signed-in student and centre. All ordered pages load before display, with bounded module lookups, 20-row display pages, module/mark/date filters and links to module overview, class invitations and guardian sharing. Recorded attendance uses `(present + late) / (present + late + absent)`; excused and unknown marks are excluded. No denominator means unavailable, not 0%. Unmarked sessions are not inferred as absences and the previous arbitrary risk classifications are removed. Failed or malformed reads hide the unverified report and offer refresh. Account/centre/role changes reset it.
2. **Guardian consent recovery:** attendance/schedule/communication and results use the same recovery component, while keeping separate backend permissions. A change freezes the exact desired boolean until read-back confirms it. An uncertain acknowledgement offers refresh or retry of that same change, without toggling from a stale snapshot. No success is reported from a void RPC response alone. Revocation remains available on an unverified link if a saved consent exists. Switching account/centre/roles unmounts pending UI and suppresses late follow-up reads; a request already issued to the server cannot be recalled. Pending choices are in memory only; refresh permissions after a browser reload. Existing setter RPCs and their database authorisation remain authoritative.
3. **Parent activity and results:** malformed/null projections now produce an unavailable state instead of no links/no grades. Search and 20-row display pages cover each returned projection. Existing server limits are unchanged and now explicit: latest 100 attendance marks; up to 100 invited classes from 7 days ago through 90 days ahead; latest 250 released results. This phase does not add complete historical parent access. Schedule start and end show full dates in device time, and joining links remain private. Learner/account/view changes reset selection or search as appropriate; revoked scopes hide their content and discussion.

Hosted acceptance: apply the earlier required migrations first; verify corrected marks in lecturer and student reports, filter an older student mark beyond 250 rows, fail a later page or module read, and switch accounts mid-request. Exercise each permission independently with approved test accounts, simulate a lost setter acknowledgement and failed read-back, retry unchanged, revoke access, and verify parent pages after refresh. Check long returned activity/results windows and their stated limits, malformed response recovery, overnight class dates and no joining-link exposure. No new migration, hosted changes, messages, provider jobs or mobile signing were performed by this bundle.

Local validation for this bundle: all 548 frontend tests pass, including 15 new attendance/guardian recovery cases. TypeScript, lint (existing warnings) and the production build pass. These checks do not establish live Supabase/provider or real-device acceptance.

### Expanded learner and role workspace coverage

The signed-in header now opens `/workspace`, a searchable directory selected by the current role. Students, lecturers, centre directors, super administrators and parents have distinct directories pointing to existing guarded routes; other specialist roles retain their dashboard/menu. The student home explicitly links to the full directory. A directory entry is navigation, not proof that its external provider or every downstream workflow is live.

| Area requested | Current route / code coverage | Remaining acceptance or build gap |
| --- | --- | --- |
| Courses, modules, subjects | Student courses and module learning journeys; lecturer teaching; director programmes/syllabuses | Confirm programme/board mappings and real course availability, fees, prerequisites and intakes |
| Timetable, in-class and remote | Academic timeline, invited classes, lecturer scheduler, Microsoft account and organiser setup | Saved weekly plans and actual Teams invitations are separate; test real organisers, room delivery and calendar changes |
| Materials, guides, recordings | Authorised library/materials, knowledge, released lesson archive | Hosted private storage and recording worker activation, recording retention/release acceptance |
| Attendance | Complete student/lecturer reports, daily register, independent corrections | Hosted migration reconciliation; per-session Teams import, historical/withdrawn roster administration |
| Language and tech labs | IELTS academy, practical lab hub, managed-lab access, instructor planning | Provider provisioning and real class/device tests; private teacher intercom remains separate |
| Residential periods | Residential weeks, sessions/bookings and director planner | Confirm actual dates, learner allocations, accommodation and transport; planning is not a booking guarantee |
| CNIC/NADRA and documents | Onboarding identity/transcript/certificate uploads; NADRA manual/configurable adapter noted in connection coverage | No verified live NADRA contract, request/response pack or frontend verification journey; document workflow needs hosted storage/access acceptance |
| CV | Career page exports a CV text draft | Persisted versioned CV profile and designed PDF export are not supplied by the existing text draft |
| Certificates | Qualification evidence upload and public reference verification | A complete student-issued certificate wallet and controlled issuance/revocation journey are not established by those two routes |
| Jobs and internships | Centre-controlled opportunity marketplace, applications, employer submission/review | Centre-allocated required/optional plans, academic supervisors, text activity logs and completion review are now built in the placement phase below; employer acceptance, attachments and schedule amendments remain |
| Fees | Student invoice history now fully paginated and centre/student scoped; total billed, paid and per-invoice outstanding, status filter and 20-row pages | Full contractual course fee including uninvoiced charges needs an explicit fee-agreement model; provider/finance reconciliation remains live acceptance |
| Coursework and results | Assigned/due/submitted work, attachments, released marks/feedback, corrections/appeals and learning plans | Programme-specific syllabus → submission → marking → human confirmation → IQA → release → appeal acceptance remains mandatory |
| Progress and reports | Released results, learning plans, lecturer report-card route and centre reports/intelligence | Review report coverage and source calculations; a link is not a validated longitudinal progress report |
| Parents | Independently consented attendance, schedule, results, practice and communication | No new financial, identity-document or unrestricted certificate access is granted to parents |
| Lecturers | Assigned teaching, scheduler/classroom, registers, resources, recordings, briefs, learning plans, labs and reports | Independent summative marking remains with assessor/IQA roles; validate teaching assignments and authorisation live |
| Admin / superadmin | Centre admissions/students/staff/programmes/schedules/assessment/quality/finance/residential/employers/reports; platform centres/accounts/finance/readiness/audit | Complete hosted operational journeys, appropriate centre context and provider setup; directory does not bypass existing role checks |

Fee hardening also ignores late checkout responses after account changes, rejects malformed invoice balances, and only follows the existing Stripe HTTPS checkout host. A custom checkout domain requires a separately reviewed allowlist change. A checkout return URL remains unverified until provider and finance records reconcile. Refresh and status filters never turn a failed invoice page into a zero balance. No real payment is initiated by tests.

Next implementation priorities from this expanded scope: (1) employer placement acceptance and schedule amendments, (2) private certificate wallet/controlled issuance and persistent CV, (3) contractual fee agreement linked to invoices, (4) document-review/NADRA handoff after approved provider specifications, (5) residential and reporting acceptance across roles. These are explicit remaining gaps, not features completed by the workspace directory.

Expanded-bundle validation: 556 frontend tests pass, including directory route/role isolation, complete invoice history, malformed-balance rejection and late checkout suppression. TypeScript, lint (existing warnings) and production build pass. Live provider, document-review and role journey acceptance remains pending.

### Centre-supervised placement phase (25 October 2026)

Reconcile `20261025084533_unipathway_supervised_placements.sql` through the reviewed hosted activation process. It adds centre-scoped placement plans, activity logs and an append-only client audit ledger, with explicit SELECT grants/RLS and no direct authenticated writes. Two new RPCs provide purpose-limited planning choices and atomic audited changes; no employer, guardian or anonymous placement access is added.

- Directors, programme leaders and superadmins with a role in the current centre can allocate an actively enrolled student/programme pair, a same-centre lecturer supervisor and a verified employer. Plans record required/optional status, target minutes, dates and learning goals. Learner/programme, supervisor and employer names are recorded as allocation-time labels; names are not copied from client input.
- A plan starts only within its scheduled dates with active enrolment and a verified employer. Students submit dated text activity/evidence logs only while active. Dates must be within the placement and not in the future in Pakistan time. One pending/approved log per placement/day is permitted, and total non-rejected recorded time across a student's placements cannot exceed 24 hours/day.
- Assigned academic supervisors or centre placement managers approve/reject pending logs with a reason. No student can approve their own entry, even with another staff role. Rejected entries remain in history and can be replaced by a new submission; approved entries cannot be edited by this UI. Completion requires the target approved minutes and no pending logs, plus active enrolment and verified employer. Only managers start or cancel; completion is an academic placement record, not qualification/certificate issuance.
- Request UUIDs and exact payload receipts prevent duplicate writes on retry. A partial unique plan identity also blocks duplicate non-cancelled plans for the same learner/programme/employer/dates/title. State transitions, log review and receipts commit atomically. Refresh after uncertain responses; pending choices stay in memory only. Leaving/switching accounts suppresses late UI continuations but cannot recall an already issued request.
- Students, lecturers, directors, programme leaders and superadmins have guarded placement routes/sidebar links. The role workspace directory links to the main relevant routes. Lists load complete ordered pages and expose search and 20-placement display pages; activity and audit reads must both succeed before action controls appear. Employers continue to use opportunity/application workflows; an application does not automatically allocate a placement.

Hosted acceptance: review advisors, verify both RPC grants and RLS under student, assigned/unassigned lecturer, programme leader, director, other-centre superadmin, employer, guardian and anonymous accounts. Test two concurrent retries, competing approvals/cancellation/completion, employer suspension, withdrawn enrolment, revoked supervisor role, pending evidence, rejected-log replacement, duplicate days and multi-placement daily limits. Confirm no direct table mutation succeeds. The local advisor command could not connect because no local Supabase server was running; offline tests do not replace hosted advisor/concurrency acceptance.

Remaining placement work: employer mentor consent/access and workplace verification, application-to-placement acceptance handover, explicit learner acceptance and contractual/safety evidence, file attachments, rescheduling/supervisor reassignment with audit, approved-hour corrections, programme-wide unallocated requirement planning, reminders and calendar delivery. This phase creates an allocated required/optional plan; it does not invent unallocated requirements or send employer notifications. Cancellation preserves existing logs and decisions. No hosted migration, real placement, message or provider job was executed.

Placement validation: 565 frontend tests pass (9 new placement UI cases), 44 placement database checks pass in the full 179-migration offline rehearsal, and 39 activation preflight checks pass. TypeScript, lint (existing warnings) and production build pass. Provider extensions remain explicitly deferred offline; hosted concurrency/provider/device acceptance is not claimed.
