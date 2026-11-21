# UniPathway staging bootstrap — next phase

**Status:** source-code staging controls only; no production database writes, no Lovable publish, no AWS or Microsoft credentials. This is the follow-on to merged PRs #47 and #49.

## What is currently blocking a live test

On the last authenticated inspection, the **production Lovable/Supabase database had 57 public tables** and only four recorded Supabase schema migrations. The separately named Lovable QA project had **zero public tables** and still reported `creation_status=in_progress` / project `status=building`. The connected Supabase app listed only a Dishbee project, not an identifiable UniPathway staging Supabase project.

Those observations mean we cannot responsibly infer a staging project ref or clone production users from this conversation. **Neither repository source sync nor a passing GitHub synthetic database suite is evidence the staging schema has been created**.

## Safe sequence

1. **Confirm or finish provisioning an isolated staging Supabase project** for UniPathway, including its actual 20-character project ref. Locate the real **production** Supabase ref independently. Both IDs must differ. Do not treat `sthrhcmjypwuorlbscfw` from repository `supabase/config.toml` as confirmed staging.
2. **Offline inventory:** manually invoke the protected GitHub `UniPathway Staging Bootstrap (Explicit Manual)` workflow, `operation=inventory`. This computes a SHA-256 fingerprint of each migration, identifies suspicious SQL, duplicates and missing dependency waves, but applies nothing.
3. **Actual staging DB preflight:** configure protected staging values and invoke `operation=staging-preflight` with `confirmation=UNIPATHWAY_STAGING_ONLY`. The SQL connection is forced to `db.STAGING_REF.supabase.co`, a separate production ref must be supplied, and the transaction is **read only**.
4. **Migration review before execution:** reconcile the old Lovable 57-table schema with all source migrations in order. Resolve any invalid `CHECK` subquery, duplicate old constraint/policy, RLS and role enum issues. Prepare a reviewed migration plan, snapshot and rollback. **These tools intentionally do not apply migrations.** Only the approved staging migration process may do so; do not apply these files directly against production.
5. **Create two fictitious test centre tenants:** once staged schema is verified and backed up, run `operation=create-test-tenants` with *both* explicit acknowledgements and GitHub protected environment approval. It creates `unipathway-qa-tenant-a` and `unipathway-qa-tenant-b` only, returning UUIDs without secrets. Add them to the protected `UNIPATHWAY_STAGING_TENANTS_JSON` variable.
6. **Provision test accounts:** run `operation=create-test-accounts` with both acknowledgements, 23 **unique** credentials in the protected secret, and the two staging tenant IDs. It only creates or reconciles explicitly tagged fixture users under `@educloud.test` (21 roles + student B + same-tenant uninvited student). It will not reset passwords or alter untagged existing users. If an old untagged account already exists, resolve it manually after verifying ownership.
7. **Seed purely fictitious class/assessment/media references** with approved isolated staging operations. Requirements: active vs revoked invitations, same-tenant unenrolled student, cross-tenant class/whiteboard, private module materials and separate storage objects, independent assessor, IQA and released/unreleased coursework, coding evidence, centre A/B assignments. Never upload actual student submissions or records.
8. **Run existing authenticated acceptance** from `.github/workflows/unipathway-staging-acceptance.yml` using the protected `unipathway-staging` environment. `scripts/verify-unipathway-staging-academic.mjs` runs 23 real Supabase Auth logins and negative/positive RLS and private Storage reads; the IELTS suite runs separately. Fill the protected fixture JSON. Missing tables and credentials are failures, not fake successes.
9. **Pilot real UI with test data**: 21 dashboards, mobile navigation, revoked classes, failed file access, learner submissions, lecturer brief, independent assessor allocation, Omniqora advice where privacy approved, IQA release, appeals, resubmission and marks. The test API cases do not yet constitute full browser acceptance with every role.
10. **Only after all gates** can leadership approve a separate production migration and rollout. Require backup/restore, written centre policies, security review and incident rollback. AWS and Microsoft Teams live provider functions remain disabled until their own licensing/credentials/tests.

## GitHub protected environment variables

Configure these as GitHub *environment* variables under a protected `unipathway-staging` environment, with required reviewers:

| Variable | Description |
|---|---|
| `UNIPATHWAY_STAGING_PROJECT_REF` | Independently confirmed 20-character staging ref |
| `UNIPATHWAY_PRODUCTION_PROJECT_REF` | Independently confirmed production ref |
| `UNIPATHWAY_STAGING_TENANTS_JSON` | Generated after step 5: `{"a":"UUID-A","b":"UUID-B"}` |

Configure these encrypted **environment secrets**:

| Secret | Purpose |
|---|---|
| `UNIPATHWAY_STAGING_URL` | `https://STAGING_REF.supabase.co/` |
| `UNIPATHWAY_STAGING_DATABASE_URL` | Direct PostgreSQL `db.STAGING_REF.supabase.co`, read-only preflight only |
| `UNIPATHWAY_STAGING_SERVICE_ROLE_KEY` | Staging-only admin account/tenant creation; never place into browser or repository |
| `UNIPATHWAY_STAGING_ROLE_CREDENTIALS_JSON` | An object of 23 distinct 24–128 character passwords without whitespace, keyed by the exact fixture keys below |
| `UNIPATHWAY_STAGING_ANON_KEY` | Public API key for authenticated browser/account tests |
| `UNIPATHWAY_STAGING_FIXTURES_JSON` | Existing IELTS/progression two-tenant fixture IDs and authorised test credentials |
| `UNIPATHWAY_STAGING_ACADEMIC_FIXTURES_JSON` | 21 named accounts, two isolation students and the synthetic protected LMS resource IDs |

**Fixture keys:** `superadmin`, `director`, `admissions`, `lecturer`, `programme`, `qa`, `exams`, `finance`, `marketing`, `agent`, `student`, `unipartner`, `employer`, `assessor`, `eqa`, `welfare`, `parent`, `office`, `hr`, `secretary`, `security`, `studentB`, `uninvitedStudentA`.

Do not print the JSON password values in CI logs. Do not reuse a password across roles. Credential generation should happen through a secure password manager; the bootstrap script intentionally refuses shared passwords.

## Run modes and safety

- `node scripts/plan-unipathway-migrations.mjs --json`: local offline source inventory; no network.
- `node scripts/plan-unipathway-migrations.mjs --staging --strict --json`: metadata-only read-only direct PostgreSQL access to the verified staging project, fails on known SQL issues/missing role safety.
- `node scripts/init-unipathway-staging-tenants.mjs --plan`: requires staging project identity environment, but no secrets or DB writes.
- `node scripts/bootstrap-unipathway-staging-accounts.mjs --plan`: provides 23 expected account records without requiring a service key.
- Both `--apply` operations require `STAGING_RUN_ACK=UNIPATHWAY_STAGING_ONLY`, `UNIPATHWAY_STAGING_WRITE_ACK=I_APPROVE_ISOLATED_STAGING_FIXTURES`, `APP_ENV=staging`, `UNIPATHWAY_ISOLATED_STAGING_SEED=true`, matching verified host/ref and protected service key.
- The old `seed-dev-users` Edge Function is **disabled with 410** in source because it used a shared password and an unverified first-tenant fallback.

## Ownership and cost

An isolated project can have **real hosting charges**, and creating one must be separately approved once pricing is known. The current tools cannot infer that a named Lovable QA project is a complete independent Supabase deployment. Do not create a new paid Supabase project, AWS resource or Microsoft subscription without the user's explicit approval of any nonzero cost.

**Current completion definition:** reproducible source migration inventory, read-only staging metadata comparison, protected two-tenant fixture creation, separate role credentials and a documented handoff to 21-role acceptance (23 accounts). The next stage after provisioning is a full schema rehearsal and per-role test-session recording.


## November 18 coverage update
The source-only academic gate now requires 21 named roles plus two learner isolation identities (23 accounts). Add office (`office_admin`, dev.office@educloud.test), hr (`hr_officer`, dev.hr@educloud.test), secretary (`secretary`, dev.secretary@educloud.test), and security (`security_officer`, dev.security@educloud.test), each centre-A scoped with a unique protected password. Bootstrap plan includes these identities; apply still requires all existing staging safeguards. No accounts have been provisioned by this change. The four additional roles must fail reads of private AI drafts, provisional marks and cross-centre coursework. This expands Auth/RLS coverage, not browser or complete role functionality acceptance. Missing fixtures fail closed.
