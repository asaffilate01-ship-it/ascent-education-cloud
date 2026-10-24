# Intelligence wiring — 23 October 2026

Extends draft PR #51. Source changes only; no live migrations, provider resources, publication or production writes.

## Completed
- Management dashboard now invokes the existing authenticated student, cohort and executive calculation functions.
- Learner choices include distinct active programme/enrolled course learners in the current centre. Cohort choices are centre-scoped. Choice failures block actions and expose retry.
- Requests send the selected learner or course/cohort identity only. Server-side profile/role resolution remains the authority for tenant access.
- Successful receipts must match the centre and selected target and contain a saved snapshot identifier/date. Missing attendance, denied access, missing targets, throttling and unconfirmed responses do not show success.
- Duplicate submissions are blocked. Account/centre/role changes remount the workflow; late responses from an old workflow are ignored.
- Dashboard reads `omniqora_cohort_intelligence`, matching the cohort generator's writes, and displays the latest executive snapshot. Legacy course snapshots are no longer presented as current cohort output.
- Legacy scores are excluded from the recorded-attendance risk count. Unsupported metrics stay unavailable. Cohort/centre calculations explicitly use existing learner signals, rather than claiming bulk recalculation.

## Validation
- 351 application tests across 83 files passed, including 9 new calculation tests, 2 new dashboard tests and existing handler authorization tests.
- TypeScript and production build passed. Targeted lint passed after cleanup.
- Fresh local schema rehearsal: 164 migrations replayed; 11 identity/whiteboard, 15 guardian and 17 admissions checks passed. The pg_cron/pg_net installation migration remains deferred. This is synthetic Auth/Storage validation, not hosted API acceptance.

## Staging blocker and remaining release work
- QA project `6b6517b6-1468-4a03-84a3-0fa5c40a40a2` still has no readable `supabase/config.toml` and reports scaffold creation in progress.
- Recovery request returned UNKNOWN platform failure, no commit and no actionable approval payload. Its narrative summary is inconsistent about the project identifier; it is not evidence of recovery or a database change.
- Editor fallback reaches a login wall. Google sign-in needs a verified secure browser-auth choice.
- Restore isolated hosted staging; verify its backend differs from production; apply the reviewed fresh baseline only to the empty staging target; run authenticated Auth/PostgREST/Storage/Realtime acceptance and actual calculation/save/reload tests.
- Existing production requires its own read-only drift inventory, reviewed upgrade, backup and rollback plan. Fresh-staging overrides are not a production upgrade.
- Teams Graph lifecycle, institutional checkout/callbacks, AWS activation, scheduled intelligence/Factory processing and downstream completion reconciliation remain incomplete or unverified. No provider readiness is inferred from these UI changes.
