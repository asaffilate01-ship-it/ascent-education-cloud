# Application handover coverage

The staff Support Desk now includes a centre-wide application queue built from its existing complete application/task snapshots. Applications with no tasks are visible alongside overdue, undated, scheduled, completed-recorded-work and cancelled-only plans. Counts and state filters cover all application stages; an explicit stage filter and programme/country/intake/case/learner search support focused reviews. Results are ordered by coverage state and earliest open deadline, with stable case-ID ordering and 20-row navigation.

Open support plan selects the exact application and moves focus to its existing task workflow. Staff can create or edit work there using the established role, tenant, audit and conflict controls. No new tables, permissions, provider calls or automatic messages are introduced.

Coverage labels describe recorded tasks, not visa decisions, admission, travel readiness or a complete plan. Cancelled-only work is never counted as completed. Invalid or absent open deadlines require attention. Completed/cancelled tasks do not become overdue. New open work makes a previously completed plan open again.

The queue is shown only after both snapshots load successfully, resets on centre/user change and re-evaluates time using the desk's existing minute timer. Tests cover absent plans, cancellation, deadlines, application isolation, reopening, filters, selection and pagination. Existing database and live staging gates remain applicable; no migration or production deployment is part of this increment.
