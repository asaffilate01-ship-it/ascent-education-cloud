# Centre-wide application support desk

Adds a staff workspace at `/admissions/application-support`, `/director/application-support` and `/landlord/application-support`, with links in the corresponding sidebars. Existing route guards and database RLS remain in force. There are no new migrations in this phase; the previous support-task migration is required.

The desk pages through same-centre task and application data, then presents 20 filtered tasks at a time. Staff can filter open/completed/cancelled work, overdue deadlines, the next seven days, undated tasks, category and tasks they created. Search covers task titles, categories, case/learner IDs, programme and destination country. Summary totals describe the loaded centre snapshot; refresh is required to pick up another staff member's changes. Urgency is recalculated each minute. Closed tasks are never classified overdue.

Staff can edit title, learner-visible instructions, status and deadline. Updates compare the full original timestamp and case/tenant identity. Conflicts leave the unsaved form text visible instead of silently overwriting another change. Unchanged deadlines preserve their original timestamp precision. Edited deadlines use the browser's local timezone and reject invalid local times. Owners and linked applications remain immutable.

Task history reads the existing audit records on demand with tenant/entity filters and pagination. It reports actor IDs, timestamps and status transitions or a details-update event. Audit events do not retain full before/after instruction text or deadline values. The application picker opens the existing support plan for adding tasks; saving refreshes the centre queue.

No learner-facing edit controls, notifications, external communications, provider calls, automatic bookings or reassignment are introduced. Notes remain visible to the learner and must not be used for confidential staff records.

Validation covers role denial, scoped snapshots, failed-source handling, urgency boundaries, stable sorting, creator filters, optimistic edits, unsaved text retention and deadline precision, alongside the existing tests. Full staging migration replay and real role/browser checks remain outstanding before deployment.
