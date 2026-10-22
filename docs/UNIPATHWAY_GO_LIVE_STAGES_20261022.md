# UniPathway staged go-live work — 22 October 2026

## Stage 1: database readiness and access hardening — IN PROGRESS

This branch starts from main `2df767a`; managed AWS PR #48 remains a separate draft.
No production or staging DDL, accounts, messages, provider resources or deployments were changed by this pass.

### Delivered in source

- Added an offline PostgreSQL migration rehearsal with synthetic Supabase Auth/Storage scaffolding and actual pgcrypto. It executes every file in order, stops on the first failure, never connects to a hosted service, and logs only filename/code/message, not credential-bearing SQL. `npm run rehearse:schema` is a diagnostic/release gate, not an always-green fixture.
- Fixed the inventory scanner's false classification of valid RLS `WITH CHECK (SELECT ...)` as invalid table CHECK constraints. Historical auth provisioning/password-update scripts now require explicit review.
- Added a stage-first migration that removes browser self-enrolment into conversations. Creation is one authenticated server transaction deriving tenant and sole initial member from the authenticated identity. Additional participants still require an authorised invitation workflow; this change does not implement that workflow.
- Added private messaging attachments, member-checked Storage policies, owned upload paths, a 10 MB limit, download links issued for 60 seconds, message attachment validation and upload failure cleanup. Stored messages contain paths, not bearer links.
- Replaced cross-organisation legacy job-write access with centre-scoped director access. Employer posting must use the newer verified-employer workflow; a legacy employer role alone is insufficient.
- Sending now retains text and reports an error if the backend rejects the message.
- Added a PostgreSQL RLS fixture covering same-tenant nonmembers, other tenants, forged upload ownership, revoked membership, director tenant reassignment and blocked employer writes.

### Verified blocker — do not mark stage complete

The ordered rehearsal executes 20 migration files, then fails at
`20260316060647_11d03e1b-a05b-48f7-9fce-ee9d42fcdd49.sql` with SQLSTATE 23503:
its historical attendance seed rows reference a tenant absent from a clean database.
That migration also seeds notifications and conversations against hard-coded users/modules.
The following migrations have not been certified by this rehearsal. Do not skip this file silently or insert invented tenant/student records to make the run green.

Four historical auth-related migration files also need a reviewed fresh-start decision before any hosted replay:
`20260316034033`, `20260316050618`, `20260316053920`, `20260316221958`.
Retain schema/trigger changes, but replace historical shared/demo identity provisioning with the existing guarded two-tenant/19-account fixture process. Preserve source hashes and a documented fresh-staging baseline; do not mark unapplied production migrations as applied.

### Hosted state confirmed in this session

The named QA Lovable project has an enabled Supabase database, 0 public tables, 0 auth users and 0 buckets. Its `supabase/config.toml` is unavailable and the SQL project-ref setting is null. The existing scripts' independent project-ref/production-ref check remains intact. A project label is not proof of a usable authenticated staging endpoint.

Production was read-only during the audit: 57 base tables, 4 recorded migrations, 5 programmes, no enrolments/assignments/invoices and 13 tenant role/profile mismatches. Those are not fixed by committing this PR.

### Remaining Stage 1 exit gates

1. Produce and rehearse an explicit fresh-staging baseline separating historical sample/auth data from schema changes; resolve every SQL failure rather than relying on the static scanner.
2. Independently identify staging URL/ref and production ref; configure the protected staging environment. No new paid project is required or approved by this branch.
3. Apply the reviewed schema to the isolated target, verify migration/object parity, then create two QA tenants and 19 separate synthetic accounts using the guarded bootstrap.
4. Run authenticated positive/negative Auth, PostgREST and Storage tests. The 20 PGlite checks do not certify signed URL transport or real user login.
5. Inventory existing messaging uploads in public resources and relocate confirmed private attachments with an audit trail. This migration does not delete existing public objects or change unrelated resources.
6. Validate the existing independent-assessment/legacy-grade cutover and replace parent legacy-grade reads before a live pilot.

## Following stages

| Stage | Outcome required before advancing |
|---|---|
| 2 — end-to-end learning | Application → admission → enrolment → module materials/class invitation → submission → independent assessor → IQA → released result; authorised resubmission and appeal; parent access separately approved |
| 3 — operations | Complete exams, finance reconciliation, verified employer/partner actions and recipient-consented messaging; persistent actions and honest error states |
| 4 — providers | Microsoft meeting/recording lifecycle, payment callbacks, notifications and optional AWS labs with separate credentials, permissions, cost caps and shutdown acceptance |
| 5 — interface acceptance | All 17 dashboards on desktop/mobile, meaningful empty/loading/error states, keyboard navigation, private downloads and cross-role isolation |
| 6 — controlled release | Backups and restore rehearsal, migration parity, monitoring, provider failure drills, small consented pilot, separate production rollout decision |

Provider activation, production migration and publishing are separate from code readiness. Existing public website availability does not certify private academic workflows.
