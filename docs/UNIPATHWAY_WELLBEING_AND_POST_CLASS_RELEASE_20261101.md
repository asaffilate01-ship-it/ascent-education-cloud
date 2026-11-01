# UniPathway — Student Wellbeing, Anonymous Counselling & Post-Class Release
**Date:** 1 November 2026 | **Scope:** PR #177, GitHub source and staging-only forward patches. No live Supabase, email, Microsoft, AWS or counselling provider changes were made.

## Student support — actual UX delivered in source

**Student routes:** `/student/wellbeing` (verified student), `/wellbeing/anonymous` (separate public anonymous mode), `/student/support` (existing general messaging).

The student can select mental-health/emotional wellbeing, study or examination pressure, personal/family circumstances, financial hardship, bullying/harassment/safety, accessibility adjustments, housing or another concern. Priority choices are routine or prompt review when staff are available; neither claims an immediate response. Messages have length validation, safe failure messages and no inferred diagnosis. A plainly worded emergency disclaimer points to local emergency services and qualified professionals rather than promising 24-hour crisis monitoring.

**Confidential named mode:** current student JWT + verified centre-role membership; a private database RPC saves a case linked to `student_id`. Student sees own case statuses and only their own Welfare replies using separate verified RPCs. Only an explicitly assigned `welfare_officer` of that centre can review the full message. No lecturer, agent, guardian, HR, office or ordinary director visibility is granted. Welfare internal notes and student-facing replies are stored separately. Each staff status update checks expected revision and writes a restricted audit record. Replies use one-time caller nonce for safe network retry; they appear in the student's private portal but **no SMS/email delivery is implied**.

**Anonymous one-way mode:** explicit choice, no student ID, no JWT attached, `credentials:'omit'`, `no-referrer`, independent Edge function with exact origin, Turnstile one-time verification, transient abuse limit, server-only enabled flag and verified active UniPathway tenant routing. The server writes `student_id=NULL` and returns only a success acknowledgement, not a case ID, login or contact. Students are warned that technical provider/network logs may exist, message contents can identify them if they include personal details, and Welfare staff cannot reply to an anonymous sender. This is not a confidential chat with a hidden username.

**Safeguarding and staffing:** human-led triage, qualified counselling referrals, record retention, operational response coverage, disclosure limits, escalation and emergency procedures require a separate centre policy and real trained personnel before activation. The software does not provide therapy, automate risk assessment, search for the reporter's identity or send emergency dispatch. School officials should have an approved process for handling reports indicating immediate danger.

## Class materials / recording release policy

- **Default:** class-specific materials, associated online slides, worksheets/notes, archived recordings and AI revision packs unlock **24 hours after an independently recorded actual class end**.
- **Exceptional urgency:** a verified Centre Director or Programme Leader may record a 20–500-character justification and approve **12 hours after verified end**. This is never a release before the class has finished.
- **End confirmation:** authorised lecturer/academic manager records a class-end evidence reference. The release clock starts from the later of the official scheduled end or the securely confirmed actual end. A scheduled end alone, cancellation or a missing actual end never unlocks files.
- **Student scope:** current signed-in student + tenant + active programme enrolment + module + class release check. A class-release time is not itself authorisation for another student or centre.
- **Teaching scope:** assigned lecturer and authorised academic management prepare private drafts and verify class completion. Staff may work with their own class resources before student release; only designated academic management can approve urgent 12-hour release.
- **File access:** restrictive RLS on `unipathway_module_materials`, `live_class_artifacts`, `lesson_ai_packs`, and on private `storage.objects` for both module-material and class-media buckets. Public checked RPCs gate file signing. Playback and offline downloads also check the server before creating 120-second signed URLs; offline downloads recheck before saving.
- **General preparatory and accessible study resources:** not linked to a completed class, may be separately authorised for advance study and learning adjustments. A lecturer must actively declare this in the uploader. It must not become a loophole to publish post-class slides, notes or recordings early.
- **Evidence and existing data:** all existing class-specific materials must be accurately linked to `class_session_id` before activation. Never relabel class-specific legacy files as general. All stored class end times must be verified; do not backfill with invented timestamps. Existing signed links may remain valid until expiry, and already-exported/offline copies cannot be remotely removed retroactively. Treat these as migration and safeguarding risks requiring supervised review.

## Source files and staged integration

- Student UI: `src/pages/student/StudentWellbeing.tsx`; staff UI: `src/pages/health/WelfareSupportDesk.tsx`; common validation `src/lib/wellbeingRequests.ts`.
- SQL: `scripts/activation/unipathway-wellbeing-requests-forward.sql`. Edge: `supabase/functions/unipathway-anonymous-welfare/index.ts`. `supabase/config.toml` explicitly sets only this anonymous function to `verify_jwt=false`; Turnstile and strict Edge validation **must** replace account auth for that endpoint.
- Teaching UI: `src/pages/classroom/ClassReleaseManager.tsx`. Media/SQL: `scripts/activation/unipathway-post-class-resource-release-forward.sql`, `src/lib/learning/classRelease.ts`, `src/lib/learning/classMedia.ts`, `src/lib/learning/offlineSync.ts`, `src/pages/learning/ModuleMaterials.tsx`, `src/pages/student/LessonArchive.tsx`.
- New nav: Student dashboard, Student and Welfare sidebar/mobile, and lecturer/director/programme dashboards.
- New tests: `src/test/unipathway-wellbeing-class-release.test.ts`; `scripts/test-unipathway-wellbeing-release-db.mjs` runs isolated PGlite RLS/SQL rehearsal via Production CI.
- Client feature flags **default off**: `VITE_UNIPATHWAY_WELLBEING_ENABLED`, `VITE_UNIPATHWAY_ANONYMOUS_WELLBEING_ENABLED`, `VITE_UNIPATHWAY_TURNSTILE_SITE_KEY`, `VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED`.
- Backend flags and secrets **never ship to browsers**: `UNIPATHWAY_ANONYMOUS_WELFARE_ENABLED`, `UNIPATHWAY_PUBLIC_ORIGIN`, `UNIPATHWAY_WELFARE_CENTRE_ID`, `TURNSTILE_SECRET_KEY`, the correct Supabase service role credential.

## Required go/no-go before live activation

1. Confirm the correct UniPathway database project. The account-linked Supabase connector in this chat exposes DISHBEE only. Do not make any migration, Auth or Edge change there. Confirm a dedicated staging environment, backup, live schema names and migration ledger for UniPathway.
2. Rehearse both SQL forward patches against a restored UniPathway staging snapshot. Review naming/role privileges, existing permissive RLS, storage bucket ownership, runtime SQL security advisors and signed URL tests. Class-resource RLS must not be active without the correctly reviewed data mapping and public ACL wrappers.
3. Authenticate independent students, welfare staff, academics and cross-centre actors against **real JWTs**. Check confidential/anonymous reads, forbidden anonymous replies, stale case revisions, repeated reply nonce, direct REST, Edge and storage URL requests. Revoke roles while logged in and confirm access ends.
4. Verify anonymous anti-abuse provider, site key, secret, exact origin, tenant match, abuse handling, personal-data retention/privacy notice and trained Welfare roster **before** enabling anonymous collection. Never advertise it as an emergency service.
5. Verify class `status='ended'` + actual end evidence, 23:59 vs 24:00, 11:59 vs 12:00 urgent, reschedules/cancellations, wrong enrolment, other centres, modules, signed URLs, cached offline copies, published packs, access after role withdrawal and accessibility alternatives. Actual attendance remains a separate monitored process; a time embargo encourages attendance but does not prove it.
6. Run final exact-head CI (TypeScript, build, lint, unit tests, synthetic PostgreSQL, Edge, Playwright and native), manual accessibility and mobile tests, and independent provider verification. Only then consider merging, backend deployment and controlled feature-flag activation.

**Status:** GitHub implementation and staging scripts committed. Hosted functionality and real counselling response service remain **unverified**, with flags off by default.
