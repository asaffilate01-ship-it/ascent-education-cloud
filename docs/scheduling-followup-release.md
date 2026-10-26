# Scheduling, follow-up and navigation release — 26 October 2026

This continues PR96 and the competitor gap register. It does not mark the entire LMS audit complete.

## Delivered

- PostgreSQL range exclusions prevent overlapping lecturer, module, normalised room and named student-group bookings. Effective date intervals and partial time overlaps are checked across academic-year/semester labels. Adjacent classes and non-overlapping date periods are allowed. Exclusion constraints enforce the boundary during concurrent writes; the test harness verifies constraints but is not a multi-session load test.
- A student-group reference can be reused across modules. Groups with different names are not automatically compared by individual learner membership. Biweekly/one-off legacy entries are conservatively treated as weekly ranges; the editor creates weekly entries.
- Staff can edit or cancel timetable entries with an explanation and an optimistic updated-at check. Cancellation preserves the record and adds immutable history; ordinary clients cannot delete schedules. Enrolled students can read their module's change history, and withdrawal revokes it. Live Teams invitations are not automatically changed by this action.
- The bulk scheduling RPC now adds missing slots without deleting previous bookings; retries do not wipe the timetable. It remains SECURITY INVOKER and passes through assignment RLS and exclusion constraints.
- Staff follow-ups have a named owner, Pakistan-date deadline, normal/high priority, status, outcome and immutable version history. Only the creator, assigned staff member and centre managers can read the task. Assignees can report progress but cannot change assignment details. Students, parents, agents and unrelated staff cannot view these internal tasks. Tasks remain distinct from assessment decisions and financial access controls.
- Everyday navigation has at most five role destinations plus My Workspace. Specialist destinations remain available in collapsible groups and the searchable workspace. The collapsed sidebar hides specialist groups. No authorised destination was removed.
- Course navigation follows Today → My course → Next lesson → Submit work → Read feedback. Classes/resources sit in a quieter expandable group. Supported destinations preserve the module query parameter; arbitrary student/class parameters are not copied into unrelated tools.
- A selected class now links teaching/recordings, questions, the daily register and its course workspace. The register starts with the authorised module and Pakistan date. Daily attendance remains per learner/module/date, not a substitute for per-session Teams attendance.
- Lecturer attendance reports use task cards on small screens and a table on larger screens. Module-level navigation and class-level navigation share touch-friendly controls. Approved branding and imagery are unchanged.

## Live deployment and validation

`20261026000118_schedule_and_staff_followup.sql` was rehearsed in a rolled-back live transaction and then deployed with its migration ledger entry. Verified four exclusion constraints, RLS on all three new tables, no client schedule DELETE, no anonymous staff-directory execution, and an invoker bulk scheduler. The live schedule table was empty before deployment; no real roster, group membership or class assignment was invented.

Validation:

- 39 PostgreSQL checks covering partial overlaps, semester-label bypass, normalised rooms/cohorts, disjoint dates, cancellation, task roles, tenant boundaries, ownership, stale writes, audit visibility and non-destructive bulk retry.
- Full 187-migration synthetic schema rehearsal; external provider extensions/acceptance remain deferred.
- 23 navigation/task unit and component tests, plus 19 register/attendance/teaching tests.
- TypeScript and production build.
- 12 synthetic responsive browser checks at 320/390/768/1440 pixels: task creation, confirmation, course-context links and no horizontal overflow.

## Remaining programme of work

Follow the user's agreed order:

1. **Deployment and permissions:** reconcile the remaining modern classroom/materials/assessment schema against the live legacy backend; obtain an approved real staff/student/course roster and verify two-course/two-tenant access through storage and providers.
2. **Connected enrolment:** connect evidence, assessment, identity, offer, payer/funding, cohort and class invitations to the deployed reviewed handover. Do not treat payment stage or email confirmation as NADRA verification.
3. **Course workspace:** complete protected inline documents and released recordings in the lesson player, prerequisites, reusable approved curriculum units, revision restore and teacher/student preview across all content types.
4. **Teacher/assessment:** finish provider invitation reconciliation, substitutions, student-membership/capacity/travel clashes, inline PDF/image/stylus marking, reusable feedback, source-linked task ownership and safe bulk actions. Preserve independent assessor/IQA/appeals gates.
5. **Funding and parents:** sponsor commitments, funded places, claims/chasing and student-liability rules; five-subject packages/device terms; child-by-child weekly guardian views with consent-aware results. An unpaid sponsor must never silently become student debt or suspend entitled access.
6. **Advanced content and mobile:** safe SCORM/LTI/H5P/xAPI integration, verified authorised offline downloads, interrupted-upload recovery, account-safe cache removal, accessibility/caption checks and complete English/Urdu operational layouts.
7. **AI/providers:** source routes all AI through Omniqora; connect endpoint credentials, central budgets and edge deployments and test production acceptance. NADRA/CCTV require approved providers and institutional configuration.

The new task board deliberately uses manual, reviewable follow-ups. It does not infer learner risk or automatically make academic, funding or safeguarding decisions. Timetable history is in-app evidence, not proof that a provider invitation or notification was delivered.
