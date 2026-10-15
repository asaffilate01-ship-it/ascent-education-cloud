# Admissions operations phase

Builds on merged PR #20. No new schema, grants, provider credentials or production configuration are required by this phase. The earlier migrations must already be deployed for the workflow to function.

## What changed

- Staff can search centre profiles by name or email and choose a record instead of copying a UUID. Only the selected user ID is submitted to `create_pathway_application`; that existing RPC still checks same-centre student membership, current agreement, verified route and duplicate active cases.
- Profile search uses caller permissions and an explicit tenant filter, returns at most 25 choices, and asks staff to refine broader searches. Matches are labelled centre records: profiles can include staff, and a profile match alone does not prove student eligibility. The RPC refuses ineligible selections. Search input is escaped for literal wildcard characters.
- The referral queue filters by status and searches pathway, recipient, case/learner ID or provider reference. Next-action guidance distinguishes consent pending, manual submission, provider decisions, enrolment and closed cases. Staff cannot give learner consent.
- Staff can open paginated, read-only case history from the existing audit table. The history shows timestamps, status changes and actor IDs; it is not an external provider log and makes no claim that a provider action occurred automatically.
- Workflow reads page through the API rather than relying on its default row limit. A failed page discards the partial result and blocks the workflow until a successful reload. Counts describe the loaded snapshot; concurrent edits can still require refresh.
- Tenant changes invalidate outstanding requests and clear learner selections. No learner details are stored in local storage or sent to providers.

## Verification

Component tests cover tenant-scoped lookup, literal wildcard escaping, selected-user submission, stale centre responses, failed lookups, lazy case history and staff-only queue controls. Paging tests cover multiple pages, partial failure and cancellation. Existing learner consent tests remain in place. TypeScript, lint and the production bundle are checked.

Live browser validation with admissions, director, learner and other-centre accounts remains a deployment gate, alongside PR #20's complete staging migration replay and real Storage service checks. No production migration or provider submission is performed by this phase.
