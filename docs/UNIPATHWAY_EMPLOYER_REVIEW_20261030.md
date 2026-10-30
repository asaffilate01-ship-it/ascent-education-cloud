# UniPathway employer onboarding, consent and review — 30 October 2026

## Baseline and intent

PR #142 successfully activated **four** existing employer tables in the hosted UniPathway project, with RLS and privilege hardening. It did not attach a verified employer organisation to the supplied test account, activate real employers, complete browser acceptance, or deploy supervised-placement tracking.

This change advances the existing workflow without creating or approving any real employer, student, opportunity, internship or application. No hosted database changes or portal publication are performed by this pull request.

## Confirmed gaps in the previous source

1. Student marketplace had consented application submission but no usable withdrawal.
2. Employer workspace showed applicant counts without consented statement review.
3. Director workspace lacked recruitment-stage actions and did not invalidate late cross-centre read responses.
4. Director membership picker included organisations not yet verified.
5. Most importantly, the employer SELECT policy still allowed reads of **withdrawn** applications because consent timestamp alone remained non-null. An employer could query old statements directly, regardless of UI filtering.
6. The application trigger had no deadline or terminal-withdrawal protection.

## Changes proposed

- **Student:** account/centre-keyed marketplace; drop stale responses; list own application status; submit after explicit consent; allow withdrawal while submitted or screening; block expired application buttons in Pakistan local time. The server must independently enforce expiry.
- **Employer:** show only applicant identifier, statement and status for an already authorised employer's own opportunities. No applicant decisions and no access to admissions, health, funding or academic profiles. Hide withdrawn and non-consented rows even before the server returns them.
- **Centre:** reset and scope asynchronous reads by account, centre and roles; only verified organisations can be selected for membership approval; staff see consented statement/status; centre director/superadmin can move from submitted -> screening -> shortlisted -> accepted or decline. Admissions read-only. Withdrawn applications cannot be reopened in the new server guard.
- **Forward privacy SQL:** `scripts/activation/prepare-unipathway-employer-privacy.mjs` prints a reviewed, transactional patch (ROLLBACK by default) that alters **one existing** employer applicant SELECT policy and replaces **one existing** application trigger. It also explicitly revokes public/client direct execution on the trigger function. Existing four tables and migration receipts are preserved.
- **Regression tests:** PGlite checks privacy withdrawal, rejection of student statement tampering, no reactivation and expired applications; React tests cover account switching, membership organisation eligibility, centre review and read-only applicant display.

## Deployment and privacy gate — mandatory order

**Do not publish the new frontend before the privacy patch has passed staging and been applied to the correct backend.** The frontend hides withdrawn rows but this cannot replace server-side RLS.

1. Confirm the linked UniPathway project/URL and an independent isolated staging project by their actual identifiers; **do not** use the separately connected DISHBEE Supabase account. PR #142's recorded hosted backend is `sthrhcmjypwuorlbscfw`, which requires independent operator confirmation at execution time.
2. Back up and inspect the existing four tables, policy names, trigger definition and migration receipts. Check that PR #142 was deployed and that additional schema differences have not replaced those definitions. Obtain reviewer approval for the change.
3. In an isolated staging database, rehearse the focused script with `node scripts/activation/prepare-unipathway-employer-privacy.mjs` (prints a transaction ending in ROLLBACK). Validate no schema or data alteration persists.
4. Inspect the exact SQL and approval evidence, then use `node scripts/activation/prepare-unipathway-employer-privacy.mjs --commit` to **print** a committing transaction for controlled operator execution on staging. The script itself never connects to a provider. Record only the actually applied forward change in the target project's deployment ledger; do **not** replay historical migrations or blanket `supabase db push`.
5. Use two fictitious tenants and authorised, staging-only employer/director/admissions/student actors, all with separate Auth identities. Confirm RLS after sign-in and across accounts; include direct API reads after withdrawal (not just the UI).
6. Only after passing rehearsals and sign-off should the responsible operator apply the reviewed forward change to the confirmed hosted UniPathway backend, verify the RLS policy and trigger in place, then publish the frontend and re-run browser acceptance. A committed SQL change is **not** a certificate of deployed privacy.
7. If preflight fails, stop rather than applying the foundation migration. After commit, preserve records; use reviewed forward remediation rather than dropping employer tables.

## Required signed-in acceptance matrix

| Actor | Actions | Required checks |
|---|---|---|
| Centre director | Register prospect, verify KYB evidence, link verified employer user, approve vacancy | Evidence refs and identity/tenant/role verification; unverified org cannot be selected; no fabricated approval |
| Employer partner | Sign in, select verified organisation, save draft, view own consented applicants | Pending account gets no organisations; other employer/tenant applications denied; employer cannot decide candidate status |
| Admissions admin | View centre employer opportunities and consented application stages | Cannot approve company, publish role or update application |
| Student A | Discover published, non-expired verified vacancies; submit with consent; withdraw while submitted/screening | No private employer KYB data; duplicate direct submissions denied; withdrawn statement disappears from employer's direct SELECT |
| Student B (other tenant) | Query opportunities/applications by UI and direct API | No records from tenant A even with guessed IDs |
| Centre director | Move submitted -> screening -> shortlisted -> accepted/declined | Conditional write rechecks status/tenant; withdrawn cannot be revived |
| Supervised placement | Assign only after a real reviewed decision, named supervisor, consent and safeguarding checks | Separate placements service/migrations and attendance/logbook review must be verified independently |

## Outstanding release blockers

- A genuine employer verification record, agreed placement/vacancy terms, safeguarding/supervisor commitments, employer identity and authorised role assignment are required for production onboarding. The supplied employer test account has no verified membership.
- The connected Supabase tools in this review expose DISHBEE, **not** UniPathway; there has been no authenticated live sign-in, live database write, or hosted browser acceptance for this patch.
- The placement planning/attendance backend exists separately in source; application approval does not itself allocate a supervised placement or prove its migration is deployed. Explicit reviewer-controlled handover, attendance and outcomes remain to be demonstrated.
- Notifications, interviews/offers, retention/erasure handling, employer agreements, contact verification and audit/incident processes need further reviewed implementation.
- No source-level UI test replaces RLS checks against the exact deployed project and account roles.

## Suggested non-production commands

```sh
npm ci --ignore-scripts
node scripts/test-unipathway-employers-db.mjs
npx vitest run src/test/employer-workspace-scope.test.tsx src/test/employer-career-marketplace.test.tsx src/test/employer-centre-review.test.tsx
npx tsc --noEmit -p tsconfig.app.json
npm run lint
```

These commands operate on local fixture data, not live UniPathway records. GitHub CI results and hosted browser acceptance must be reported separately.
