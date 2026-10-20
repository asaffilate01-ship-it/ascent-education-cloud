# UniPathway — full role and RLS staging acceptance

**Status:** GitHub implementation / controlled staging gate only. This runbook does not authorise a live Supabase migration, production site publication, or changes to actual student data.

## Current verified starting point

- Code PR #47 merged into `main` at commit `c5f10bad1916f4228108803643aeb31d76829ff3`.
- The live Lovable project is still published, but **the merge was source synchronization, not evidence of a new published deployment**. Do not manually publish its protected classroom routes before schema parity is certified.
- Live production connected through Lovable: **57** public tables, including legacy `lab_sessions` and `lab_vms`, but no `unipathway_assessment_*` or `live_class_*` tables at the time of inspection.
- The separately named Lovable staging project has **0 public tables** as checked on 20 October 2026. It is NOT yet a working schema clone.
- The repository `supabase/config.toml` project reference **must not be assumed to identify staging**. Confirm actual production and staging Supabase project references independently.

## Phase 1 — staging environment preparation

1. Confirm the Lovable staging project has an **isolated Supabase project and Auth user store**, with independent backups, environment keys, email handling, policies and test domain. Use no production students' records, recordings, private attachments or banking data.
2. Verify `UNIPATHWAY_PRODUCTION_PROJECT_REF` and `UNIPATHWAY_STAGING_PROJECT_REF` differ and that the staging URL exactly matches the staging ref. Store secrets in GitHub's protected `unipathway-staging` environment, NEVER in repository files.
3. Backup the staging database. Review and reconcile **all historical source SQL migrations**, including foundation tables, roles, tenancy, IELTS, course catalogue, Teams, classes, labs, assessment, appeals and privacy cutover, against staging. Run a non-destructive migration plan; verify dependencies and remove conflicting/duplicate policies.
4. Seed two fictitious tenants A and B and test-specific course fixtures using an explicitly staging-only, audited process. **Do not reset production demo passwords** or move existing production users into staging automatically.
5. Confirm a reviewer has independently approved the migration plan, rollback and data-retention approach. Only then apply reviewed migrations to staging, not production.

## Phase 2 — acceptance test identities

The academic gate requires **17 role identities in tenant A plus 2 additional learner identities** for same-tenant and cross-tenant negative tests. All must have unique passwords, correctly scoped Supabase `user_roles` and `profiles` records.

| Fixture key | Required role | Staging email |
|---|---|---|
| superadmin | superadmin | dev.superadmin@educloud.test |
| director | centre_director | dev.director@educloud.test |
| admissions | admissions_admin | dev.admissions@educloud.test |
| lecturer | lecturer | dev.lecturer@educloud.test |
| programme | programme_leader | dev.programme@educloud.test |
| qa | iqa_officer | dev.qa@educloud.test |
| exams | exams_officer | dev.exams@educloud.test |
| finance | finance_officer | dev.finance@educloud.test |
| marketing | marketing_officer | dev.marketing@educloud.test |
| agent | agent | dev.agent@educloud.test |
| student | student | dev.student@educloud.test |
| unipartner | university_partner | dev.unipartner@educloud.test |
| employer | employer_partner | dev.employer@educloud.test |
| assessor | assessor | dev.asses@educloud.test |
| eqa | awarding_body_eqa | dev.eqa@educloud.test |
| welfare | welfare_officer | dev.welf@educloud.test |
| parent | parent_guardian | dev.parent@educloud.test |
| studentB | student, tenant B | unique local test address |
| uninvitedStudentA | student, tenant A but not enrolled for tested modules | unique local test address |

The expected scoped roles should be singular for testing. The superadmin role must be global; do not assume a global admin's profile tenant enables ordinary staff permissions. All test data is fictitious.

### Protected fixture payload shape

```json
{
  "tenants": {"a": "UUID-A", "b": "UUID-B"},
  "accounts": {
    "director": {
      "id": "UUID-DIRECTOR",
      "email": "dev.director@educloud.test",
      "password": "STAGING_ONLY_SECRET",
      "role": "centre_director",
      "tenantId": "UUID-A"
    },
    "superadmin": {
      "id": "UUID-SUPERADMIN",
      "email": "dev.superadmin@educloud.test",
      "password": "STAGING_ONLY_SECRET",
      "role": "superadmin",
      "tenantId": null
    }
  },
  "objects": {
    "classA": "UUID", "classB": "UUID", "classRevokedA": "UUID",
    "boardA": "UUID", "boardB": "UUID",
    "materialA": "UUID", "materialB": "UUID",
    "materialUnpublishedA": "UUID",
    "storagePathA": "UUID-A/module-uuid/filename.pdf",
    "storagePathB": "UUID-B/module-uuid/filename.pdf",
    "studentAttemptA": "UUID", "studentAttemptB": "UUID",
    "studentAIRecommendationA": "UUID",
    "studentHumanMarkA": "UUID",
    "studentReleasedAttemptA": "UUID",
    "studentReleasedAttemptB": "UUID",
    "unreleasedAttemptA": "UUID",
    "labTaskA": "UUID", "labTaskB": "UUID"
  }
}
```

The example shows structure only; it is **intentionally incomplete**. Populate **all 19 `accounts` entries** and the listed object references, after seeding the isolated environment. Store the complete JSON as `UNIPATHWAY_STAGING_ACADEMIC_FIXTURES_JSON` secret in the protected GitHub staging environment. Do not copy the example password into any account.

Additional protected values:

- Environment variable `UNIPATHWAY_STAGING_PROJECT_REF` — actual staging Supabase reference.
- Environment variable `UNIPATHWAY_PRODUCTION_PROJECT_REF` — independently verified actual production Supabase reference.
- Secret `UNIPATHWAY_STAGING_URL` — `https://STAGING_REF.supabase.co/`.
- Secret `UNIPATHWAY_STAGING_ANON_KEY` — public/client key to sign in test accounts, **not a service-role key**.
- Secret `UNIPATHWAY_STAGING_ACADEMIC_FIXTURES_JSON` — this new academic acceptance set.
- The earlier IELTS/academic progression acceptance uses `UNIPATHWAY_STAGING_FIXTURES_JSON` separately.

## Phase 3 — execute manually on GitHub

Trigger **UniPathway Staging Acceptance (Manual)** using the exact confirmation `UNIPATHWAY_STAGING_ONLY`. The workflow performs two **read-only** suites:

1. Existing IELTS/audio/progression student A/B isolation tests.
2. New academic acceptance: 17 named roles and tenant alignment, unauthorised same-tenant class access, revoked class, other-tenant boards, unpublished module materials, time-limited signed file access, lecturer vs independent assessor visibility, private AI drafts, provisional vs released grades, employer/university/parent restrictions and LMS code evidence isolation.

If an API table is absent, an account fails login, storage is missing, a role has wrong tenant scope or an expected private resource is readable, **the run fails**. A denied request due to a missing table is never considered an RLS pass.

The suite calls `auth.signInWithPassword`, **SELECT only** and Storage `createSignedUrl` to test approved/denied access. It does not run DB inserts/updates/deletes or provision external services. Sign-out invalidates the test sessions. Never log passwords or actual coursework text.

## Phase 4 — additional gates before live publication

- Check every major role's dashboard and navigation using real browser sessions on a staging domain, including desktop/mobile and expired sessions. Static link-contract tests alone are not sufficient.
- Confirm multi-factor authentication and least-privilege access for staff, role revocation, academic event audit, and protected file storage.
- Test submission first attempt, marker separation, Omniqora **advisory only**, IQA review, final release, permitted resubmission, exact mark penalty, grade appeal and signed appeal amendment.
- Test Teams attendee lobby and recordings with Microsoft 365 and Azure Communication Services in a real configured tenant. A Teams meeting URL alone is not an enforced participant security boundary.
- AWS credentials and cloud lab provisioning remain disabled until a dedicated AWS training account and independent spending/termination controls are approved.
- Verify production migration mapping, non-destructive backup/restore and staged rollout with rollback before enabling private LMS routes. Do not publish based solely on passing local PGlite fixtures or GitHub CI.

## Pass criteria

- GitHub source CI green on exact merge commit.
- Staging readiness: all 17 named test roles mapped and working; 2 separate tenants; API/Storage negative tests pass.
- Live Microsoft/AWS features off until their separate integration gates are complete.
- Academic leadership signs off on curriculum and awarding-body specific grading/appeal policies.
- Production DB migrations and live publish are approved as independent change events.
