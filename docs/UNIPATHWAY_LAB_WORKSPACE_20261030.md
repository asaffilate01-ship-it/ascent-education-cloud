# Lab workspace recovery and evidence phase — 30 October 2026

## Delivered

- Search authorised lab offerings by title, description, module and provider, with visible match counts and keyboard-focused reset. Filters do not widen database access.
- Student-friendly failure recovery, retry, course navigation and private support link. Technical schema details are available in the staff view, not displayed to learners.
- Catalogue refresh also rechecks gateway readiness. Readiness remains separate from fleet capacity, funding and launch approval.
- Remount all local state when account, centre or role changes; ignore superseded catalogue reads. No previous account's search, drafts, launch links or read results are retained on screen.
- Evidence drafts are keyed by session and exercise. Tutor feedback is keyed by progress record. Submitting one exercise no longer copies or clears another exercise's note. Failed evidence saves retain the draft and re-enable controls.
- Search and offering selection are disabled during mutations; changing the selected offering clears the previous launch link, class selection and help text.
- Mobile controls wrap at large text sizes rather than forcing long launch buttons beyond the viewport.

## Live database inspection (read-only)

The connected UniPathway project was checked through its native database connection. Of the nine relations checked, only `public.lab_sessions` exists. Missing: `lesson_whiteboards`, `lms_lab_offerings`, `lab_templates`, `lab_class_runs`, `lab_tasks`, `lab_help_requests`, `lab_task_progress`, `lms_lab_class_invitations`.

Existing `lab_sessions` has classroom-level fields (`title`, mandatory `lecturer_id`, `module_id`, `scheduled_at`, `classroom_session_id`, `is_lab_mode`) and RLS enabled. It lacks the per-student attempt fields expected by the later lab migrations (`student_id`, `template_id`, `minutes_used`, etc.). No learner records or credentials were read; no schema or provider resources were modified.

`20261022100000_unipathway_lms_lab_permissions.sql` explicitly targets an isolated migrated staging database and warns against replay into the legacy production schema. The earlier `CREATE TABLE IF NOT EXISTS lab_sessions` cannot reconcile this incompatible existing table. A recovery message is not a schema fix.

## Next activation phase

1. Build a tested compatibility migration against a copy of the actual legacy schema. Preserve existing classroom sessions and all referencing foreign keys; do not reinterpret classroom sessions as student attempts. Decide a distinct attempt-table name or an explicit validated migration plan.
2. Replay the full classroom/invitations, lab foundation, provider and managed-lab dependency chain in isolated staging. Re-run negative tenant, enrolment, invitation and role tests against that real schema shape.
3. Deploy the compatible schema, verify authenticated Data API reads and RLS, and refresh its schema cache. Verify whiteboard dependencies separately.
4. Deploy/verify the gateway, then configure AWS credentials, IAM, budget and idle-timeout controls, approved fleet capacity and a real student launch test. No paid resources should be created merely to test the UI.
5. Complete a real lecturer-to-student exercise/evidence/review and private help-request cycle before marking labs operational.

## Verification

Ten component behaviour tests cover search, empty recovery, error categories, successful retry, account replacement, out-of-order refresh, independent evidence and review notes, rejected saves and readiness refresh. The existing six lab privacy/launch contract tests remain. A Chromium acceptance case uses synthetic authentication/backend responses to check student schema-error recovery, provider/module search, disabled unconfigured launch, support routing and no horizontal overflow in dark mode at 24px base text across phone, landscape and desktop viewports. Synthetic tests do not establish live provider readiness.
