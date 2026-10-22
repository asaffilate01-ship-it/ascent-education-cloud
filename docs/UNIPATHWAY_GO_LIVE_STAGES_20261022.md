# UniPathway staged go-live work — 22 October 2026

## Stage 1: database readiness and access hardening — IN PROGRESS

This branch starts from main `2df767a` and now integrates the reconciled managed AWS changes from PR #48. Both source PRs remain drafts; no AWS provider is activated.
No production or staging DDL, accounts, messages, provider resources or deployments were changed by this pass.

### Delivered in source

- Added an offline PostgreSQL migration rehearsal with synthetic Supabase Auth/Storage scaffolding and actual pgcrypto. It executes every file in order, stops on the first failure, never connects to a hosted service, and logs only filename/code/message, not credential-bearing SQL. `npm run rehearse:schema` is a diagnostic/release gate, not an always-green fixture.
- Fixed the inventory scanner's false classification of valid RLS `WITH CHECK (SELECT ...)` as invalid table CHECK constraints. Historical auth provisioning/password-update scripts now require explicit review.
- Added a stage-first migration that removes browser self-enrolment into conversations. Creation is one authenticated server transaction deriving tenant and sole initial member from the authenticated identity. Additional participants still require an authorised invitation workflow; this change does not implement that workflow.
- Added private messaging attachments, member-checked Storage policies, owned upload paths, a 10 MB limit, download links issued for 60 seconds, message attachment validation and upload failure cleanup. Stored messages contain paths, not bearer links.
- Replaced cross-organisation legacy job-write access with centre-scoped director access. Employer posting must use the newer verified-employer workflow; a legacy employer role alone is insufficient.
- Sending now retains text and reports an error if the backend rejects the message.
- Added a PostgreSQL RLS fixture covering same-tenant nonmembers, other tenants, forged upload ownership, revoked membership, director tenant reassignment and blocked employer writes.

### Fresh-start repair — source completed, hosted acceptance pending

`npm run test:fresh-schema` now executes 164 of 165 ordered migrations in a disposable PostgreSQL engine. It explicitly defers only the pg_cron/pg_net extension-install migration, which that engine cannot support. It reports `schema-only-provider-acceptance-pending`, never full provider readiness. Eleven full-schema checks cover signup, repeated account repair, metadata privilege rejection and whiteboard validation/access. Synthetic Auth, Storage and Realtime scaffolding are not transport acceptance.

Original migration files remain unchanged. `supabase/fresh-staging/manifest.json` pins source and replacement SHA-256 hashes for 11 reviewed replacements:

- Six historical demo/Auth data files are excluded or reduced to their schema/trigger changes. No shared-password accounts, fake attendance, invoices or messages are provisioned.
- Quote the reserved `placing` column name.
- Reconcile duplicate live-artifact and phase-4 classroom policies.
- Add optional compatibility columns to the existing lecturer lab-session table. Preserve its required lecturer/title fields and foreign keys; active practical learning uses `uni_lab_runs`. This does not activate the superseded generic lab-session provisioning flow.
- Repair malformed whiteboard colour validation, repeated migration content and an ambiguous timestamp reference. Test valid stroke/text operations and invalid/unauthorised writes.

A new forward migration fixes signup functions referring to a nonexistent `(user_id, role)` unique constraint. It preserves existing assignments, avoids repeated student-role insertion, serialises account repair and rejects metadata role elevation.

Commands:

- `npm run rehearse:schema`: unchanged history diagnostic; still exposes the original demo-data blocker.
- `npm run rehearse:fresh-staging`: strict repaired replay; stops at unsupported provider extensions locally.
- `npm run test:fresh-schema`: explicitly scoped offline SQL/behaviour checks with provider extension installation deferred.
- `npm run build:fresh-staging -- /absolute/new-directory`: produces an ordered SQL review bundle and complete hash inventory. Includes actual provider extension SQL; never connects/applies SQL or writes hosted migration history. Refuses an existing directory.

Do not apply the replacement files as production upgrades or mark the historical versions as applied. The existing guarded staging application process needs to consume the reviewed bundle after independently verifying an empty target. Production requires a separate measured forward-upgrade plan. PR #48 is now combined in this draft and passes offline schema and managed-lab checks; authenticated staging/provider acceptance remains outstanding.

### Hosted state confirmed in this session

The named QA Lovable project has an enabled Supabase database, 0 public tables, 0 auth users and 0 buckets. Its `supabase/config.toml` is unavailable and the SQL project-ref setting is null. The existing scripts' independent project-ref/production-ref check remains intact. A project label is not proof of a usable authenticated staging endpoint.

Production was read-only during the audit: 57 base tables, 4 recorded migrations, 5 programmes, no enrolments/assignments/invoices and 13 tenant role/profile mismatches. Those are not fixed by committing this PR.

### Remaining Stage 1 exit gates

1. Complete hosted replay of the reviewed fresh-staging baseline, including provider extensions. The offline SQL stage now passes with PR #48 combined.
2. Independently identify staging URL/ref and production ref; configure the protected staging environment. No new paid project is required or approved by this branch.
3. Apply the reviewed schema to the isolated target, verify migration/object parity, then create two QA tenants and 19 separate synthetic accounts using the guarded bootstrap.
4. Run authenticated positive/negative Auth, PostgREST and Storage tests. The 20 PGlite checks do not certify signed URL transport or real user login.
5. Read-only legacy attachment inventory completed: 0 resources objects, 0 messages with public Storage URLs, 0 legacy attachment markers. Nothing required relocation at inspection. Repeat `scripts/sql/unipathway-legacy-attachment-inventory.sql` at cutover because the old public upload code is still live.
6. Validate the existing independent-assessment/legacy-grade cutover and the new learner-approved guardian sharing flow in authenticated staging before a live pilot.

## Stage 2 source work — released-results sharing and combined labs

- Parent dashboard no longer reads legacy submissions, attendance or invoices. It uses a purpose-limited server projection of independently released results, with approved appeal amendments applied. It does not assign qualification labels such as distinction or classify missing data as zero/at risk.
- Sharing needs a centre-verified, same-tenant guardian link plus an explicit choice by the linked learner. The learner can grant/revoke sharing on Approved Grades & Feedback. Reverification or identity changes invalidate consent. Parents cannot self-verify; centre staff cannot directly write the consent table.
- Earlier guardian paths into legacy final-results and tuition snapshots are removed. Attendance, finance and other guardian scopes require their own explicit policy before they can be offered.
- Added loading, retry, no-result, pending-verification and pending-permission states; failed changes report errors rather than claiming success.
- Fifteen checks against the complete schema cover self-verification denial, other-learner denial, tenant isolation, consent, revocation, approved amendments, unreleased attempts, invalidated consent and anonymous denial. Six UI tests cover errors, pending states, corrections, revocation and failed saves.
- Combined the managed-labs routes, gateway and migration from PR #48 into this draft. Resolved the package-script conflict by retaining both test suites. Full schema replay includes managed labs; its 24-check fixture passes. AWS launch still requires separate provider configuration and acceptance.
- CI now runs the explicitly scoped offline fresh-schema checks in addition to the targeted database fixtures.

Hosted blocker rechecked: the QA project is still in provisioning/building state with no available `supabase/config.toml`. No authenticated acceptance or hosted schema application is claimed. Stage 2 is partial source implementation, not completion of the end-to-end academic journey or all later phases.

## Next source increment — admission to course access

- Replaced drag-to-enrol with an explicit review panel for unconditional offers/recorded-deposit applications. Staff choose a confirmed matching learner account, an active programme and record the admission decision/evidence reference.
- New transactional handover checks staff role and tenant, confirmed Auth email, learner role/profile, programme status, application stage and existing links. Locks prevent duplicate handovers; retries return the same enrolment. Duplicate legacy auto-enrol triggers are retired.
- Direct Enrolled stage changes and browser-created enrolments are blocked; enrolled application identity/stage cannot be changed through the sales pipeline. Academic withdrawal/transfer remains a separate lifecycle task.
- Removed the hard-coded 4,500 tuition invoice and unchecked Invoice Created success message. The handover does not create invoices or certify payments. Stage 3 finance still needs approved pricing/reconciliation.
- Seventeen full-schema checks verify admission permissions, stale stage rejection, confirmed identity, atomic/idempotent enrolment, absence of invented invoices, module access after enrolment and continued classroom invitation requirements. Four new UI tests verify eligible queues, errors, selected identities and failed-save behavior.
- Validation: 329 unit tests across 80 files, full-schema replay (164 migrations, 1 provider-extension migration explicitly deferred), TypeScript and production build pass. Targeted lint: 0 errors, 2 existing any warnings.

Read-only hosted privacy check: resources bucket remains public, but contains 0 objects; 0 messages reference any public Storage URL or the historical attachment marker. No data or objects were changed.

Staging diagnosis: the earlier remix failed while copying integrations and left the staging Git reference uninitialised. The diagnostic agent run itself ended in error. Missing project source/configuration must be repaired; an empty database alone does not provide a runnable authenticated QA environment. No production credentials, data or secrets were copied.

## Following stages

| Stage | Outcome required before advancing |
|---|---|
| 2 — end-to-end learning | Application → admission → enrolment → module materials/class invitation → submission → independent assessor → IQA → released result; authorised resubmission and appeal; parent access separately approved |
| 3 — operations | Complete exams, finance reconciliation, verified employer/partner actions and recipient-consented messaging; persistent actions and honest error states |
| 4 — providers | Microsoft meeting/recording lifecycle, payment callbacks, notifications and optional AWS labs with separate credentials, permissions, cost caps and shutdown acceptance |
| 5 — interface acceptance | All 17 dashboards on desktop/mobile, meaningful empty/loading/error states, keyboard navigation, private downloads and cross-role isolation |
| 6 — controlled release | Backups and restore rehearsal, migration parity, monitoring, provider failure drills, small consented pilot, separate production rollout decision |

Provider activation, production migration and publishing are separate from code readiness. Existing public website availability does not certify private academic workflows.
