# UniPathway functional repair and verification — 16 October 2026

This is a repository-level verification, not certification that every deployed feature works. No live database writes, provider requests, messages, migration deployment or production deployment were performed.

## Repairs

- Replaced three broken intelligence generators with readable, authenticated POST handlers. Tenant comes from the server-stored staff profile, and the role must match that tenant. Executive snapshots require centre director or superadmin; student/cohort calculations also allow programme leader and IQA officer. Unscoped/global roles are deliberately insufficient.
- Used service-role writes only after authentication and scope verification, because snapshot tables intentionally expose SELECT-only authenticated RLS. Every source query and saved row is explicitly tenant-scoped. Request-supplied tenant IDs are ignored. Cross-tenant student and cohort targets are rejected.
- Removed event-count-based attendance, engagement and completion claims. Student calculation uses recorded attendance through today: present/late count as attended, excused is excluded. No eligible marks returns 422 and leaves the existing snapshot untouched. Attendance risk is `100 − recorded attendance percentage`, requires human review, and is not a validated overall risk model. Other student metrics are null. The UI now identifies the model and legacy scores.
- Cohort membership requires the selected course and cohort, enrolled status, and distinct student IDs. Cohort-specific rates remain null because student-wide attendance does not establish a course denominator. High attention counts enrolled members with a v2 stored attendance-risk score of at least 70; it does not classify unscored learners.
- Executive learner count uses distinct active programme/enrolled course learners. Provider/activity totals use exact database counts. Attendance uses actual tenant marks. Unsupported completion/engagement remain null. High attention uses v2 signals for active learners only. Quality metadata records calculation time, scope and unavailable metrics.
- Added stable ID pagination to source reads. Any source or count error prevents a snapshot write. Successful student/cohort recalculation updates its timestamp; executive recalculation records time in quality metadata.
- Replaced Playwright's missing `lovable-agent-playwright-config` dependency with the installed Playwright configuration API. Anonymous route tests now wait for an explicit login redirect instead of checking the URL before navigation settles.
- Added `check:intelligence` to Production CI with Deno. `deno.intelligence.json` maps the existing CDN SDK import to the installed, pinned npm SDK for reproducible type checking. It does not prove the deployment CDN is reachable.

## Verification results

| Check | Result | What it establishes |
|---|---|---|
| Application tests | 132 passed, 31 files | Existing workflow/UI/helper regressions plus 12 intelligence tests |
| Database fixture | 96 passed | Selected migration/RLS/workflow checks in PGlite, including cross-centre restrictions |
| Application TypeScript | Passed | Browser application and test type checks |
| Intelligence Deno check | Passed against installed Supabase 2.99.1 SDK | Three repaired entry points and shared dependencies type-check with Deno 2.9.6 |
| Production build | Passed | Application bundle builds |
| ESLint | No errors; existing warnings remain | Static lint gate |
| Browser test discovery | 23 tests discovered | Fixed configuration loads and discovers existing route tests |
| Browser execution | Blocked | Chromium download returned an invalid/truncated archive; no browser pass claimed |
| Wiring scanner | 40 functions, 14 literal frontend callers | Static invocation inventory, not runtime reachability |

The direct Deno check with the original esm.sh import failed because the environment refused the CDN connection. The reproducible check uses the installed SDK instead. Request tests execute all three real handlers with mocked authentication and database transport; they are not Supabase HTTP/RLS integration tests.

## Feature coverage and remaining work

| Feature group | Evidence available in this pass | Still required |
|---|---|---|
| Admissions, partnerships, consent, referrals, agreements and handover | Existing application tests and selected DB workflow/access checks passed | Authenticated multi-role staging journeys and partner-operated submission confirmation |
| Pathway catalogue and comparison | Existing catalogue/filter/comparison tests passed | Staging catalogue content and application journey |
| Support tasks, learner agenda and knowledge reviews/search | Existing UI/helper and DB checks passed | Real private uploads/downloads, Storage policies and authenticated learner/staff journeys |
| Readiness and integration inventory | Existing review/history/access/UI tests passed; source inventory refreshed | Evidence-backed launch decisions and real integration health |
| Factory dispatch and receipts | Existing transport/retry/tenant-boundary tests passed | Credentialed dispatch, completion reconciliation and scheduler/recovery verification |
| Intelligence | Core and handler regressions passed; scoped reads/writes and semantics repaired | Deploy, verify actual schema/Auth/RLS and refresh records. No frontend calculation caller or scheduler is connected. Cohort table is distinct from the course snapshot table shown on the current intelligence page |
| Stripe fees, institutional payments | Source inventory only; no payment was initiated | Signed webhook/reconciliation staging tests; institutional checkout adapter remains incomplete |
| Microsoft/Teams, labs, NADRA | Source inventory only | Approved provider contracts and complete implementations; generic provisioning stubs remain incomplete |
| Messaging, legacy classroom and grading | Source risks retained in wiring audit | Recipient/role restrictions and compatibility with Teams/specialist-marking policy; no messages sent |
| Remaining academic, finance, parent, HR, QA and administrative routes | Build/type/lint coverage only unless covered by the named regression files | Authenticated feature-by-feature staging acceptance with seeded roles and data |

Existing historical snapshots are not automatically recalculated or deleted. Their model/date remains visible; old snapshots must not be treated as newly validated scores. Paginated queries are complete on a stable dataset but are not a single database transaction; concurrent updates can still affect a calculation. Full historical migration replay, backups/restore, load testing and real provider callbacks remain launch gates.
