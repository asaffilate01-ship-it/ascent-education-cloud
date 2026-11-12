# UniPathway Phase 6 — accurate released-results summary and responsive grade context

## Problem and scope
The student Today dashboard shows an average of the most recent 100 independently released assessment attempts. Previously the card used `Number(...)` coercion on scores and `find(...)` across correction rows. A malformed release, stale duplicated correction or unexpected other-centre payload could produce an inaccurate `NaN%` or incorrect "approved average", even though individual released results are restricted server-side.

## Source fix
- Add `verifiedReleasedOverview`, a pure fail-closed read-model for **released** results and **one** independently approved grade amendment per attempt.
- Read the authenticated student's `student_id` and `tenant_id` with each release and amendment. Match amendment `brief_id` to the original released attempt. Reject duplicate attempts, orphan or mismatched corrections, nonnumeric/out-of-range scores, invalid release dates, cross-centre brief metadata and unbounded snapshots.
- Keep the historical **100 released-attempt** scope explicit and use deterministic most-recent ordering. Do not infer qualification weighting, credits, progression, pass/fail or external awarding-body grade from the dashboard average.
- Display a legitimate corrected score of **0** accurately, flag amended results, and preserve the existing protected feedback route. When an assessment title is not accessible but the authorised released score is, show generic "Approved coursework" without revealing another record.
- Keep failed reads distinct from no released results, preserve the Retry action, and never show partial scores after validation fails.
- Use an auto-fitting responsive definition-list grid: mobile 360/390px and 200% text reflow without squeezing three grade statistics into 100px columns.

## Evidence and tests
- New unit suite: zero-score corrections; deterministic ordering; unsupported string/NaN/over-100 scores; duplicate attempts; cross-centre/student payloads; mismatched, unknown and duplicate appeal corrections; malformed timestamp; 100-item response bound; approved metadata fallback.
- Dashboard integration: correct released assessment title and feedback link; no provisional marks; unknown/error UI for inconsistent evidence; zero correction; accessible responsive grid; stale role-change read isolation.
- Exact-head TypeScript, lint, unit, staged DB/RLS, Edge, build, browser acceptance and native Android/iOS, plus advisory design checks required before merge.

## Release boundary
No new backend grant, table, RLS policy, payment provider, live data mutation, qualification-board authority, AI grade or third-party integration. Browser/CI tests use synthetic records and do not prove authentic hosted two-centre acceptance. The full released feedback workspace's own server/RLS behaviour remains a separate operational gate.
