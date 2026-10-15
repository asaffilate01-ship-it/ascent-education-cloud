# International application support and handover

Extends PR #22's admissions work queue using the existing `international_support_tasks` table.

## Delivered

Staff can open a linked referral's support tasks, add a title, category, learner-visible instructions and optional due date, and start, complete, cancel or reopen a task. Categories cover documents, offer conditions, accommodation, pre-departure, arrival and continuing support. The creating staff member is recorded as the immutable owner; reassignment and automated reminders are not implemented.

Learners can read their tasks from the Universities Abroad screen and from linked pathway referrals. The broken `/student/global-progression` sidebar destination now has a guarded route, while `/student/international-applications` remains valid. The application screen now distinguishes failed loading from an empty list, explicitly scopes queries to the learner and centre, pages results, and counts withdrawn/rejected cases as closed. It shows recorded statuses instead of presenting every status as a percentage of a fixed journey.

Tasks remain internal coordination records. Completing them does not verify a visa, provider decision, booking, payment or external document. Notes are learner-visible and must not contain private staff notes or secrets. No email, SMS, provider API or external messaging is invoked.

## Database boundaries

Migration `20261015205338_international_support_workflow.sql` adds a composite application/tenant foreign key, field/status constraints, an update timestamp and server-controlled completion time. Directors, superadmins and admissions staff may create/update same-centre tasks. Learners only read their own application's tasks. Task identity, owner and case cannot be changed. No client deletion policy is introduced. Lifecycle writes use the existing partner audit mechanism; the task UI does not yet expose a dedicated audit-history view.

Updates compare the last observed timestamp, refuse to claim success for zero affected rows, and ask staff to refresh after a conflict. Reopening clears completion time. Reads fail closed on partial-page errors.

## Validation and release

The PGlite integration harness replays the new migration and checks staff creation, cross-centre linkage denial, immutable case identity, valid statuses, completion timestamps, stale update rejection, learner read-only access, other-learner/centre denial, reopening and audit events. Component tests cover learner controls, scoped creation, concurrent edits and load failures, plus the rewritten application screen.

Before deployment, replay the full migration history in staging and inspect existing support records for invalid statuses, oversized fields or mismatched application/tenant identity; constraints deliberately reject incompatible data rather than silently changing it. Historical completed tasks are not assigned invented completion dates. Verify real admissions/director/learner/other-centre sessions, due-time rendering and stale edits in the browser. The migration and build have not been deployed to production. PR #20's live Storage and integration activation gates still apply.
