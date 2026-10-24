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
