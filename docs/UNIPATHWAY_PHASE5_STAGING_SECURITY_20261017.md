# UniPathway Phase 5 — secure enquiries & staging acceptance
Date: 17 October 2026
Scope: Existing UniPathway in asaffilate01-ship-it/ascent-education-cloud, PR #31.

## Current truth
- IELTS student/tutor LMS, short independent Listening/Reading drills, optional private Speaking audio, formative readiness evidence, supervised practice rehearsal scheduling, external student matching, staff credential ledger, university partner applications and commission evidence are code-built in PR #31.
- Passing GitHub checks and even branch reconciliation with main do NOT mean live deployment or official IELTS/university affiliation.
- The Lovable project 2c97a03a-f146-4ff5-a22b-3765cf2f538f follows main. Its database access endpoint still returns 504, so the correct DB project ref remains unverified.
- The linked standalone Supabase connector exposes a DISHBEE project, not a confirmed UniPathway staging environment. Never apply UniPathway migrations there.
- Do not publish Lovable until explicitly approved.

## New safe public enquiry flow
1. The visitor selects IELTS preparation or university counselling (UK, USA, Canada, Australia, Germany or Pakistan), consent and current/external student status.
2. A Cloudflare Turnstile widget issues a short-lived proof. Missing site key leaves the submit button disabled.
3. The UniPathway Edge Function rejects missing challenge tokens, missing server configuration, failed challenges, wrong challenge action, and non-allowlisted challenge hostnames.
4. The server computes a SHA-256 digest of a normalised applicant email with a server-only 32+ character pepper. Neither raw email nor IP is retained in the quota table. Cloudflare token validation is the first external trust step, with no client-controlled "verified" flag accepted.
5. The server-only PostgreSQL quota function increments an atomic one-hour bucket. A fifth accepted request for the same normalized email is rejected. Each Edge isolate's in-memory limiter is defence in depth, not the primary rate limit.
6. Only after all checks does the server insert a non-enrolled admissions lead. No institutional application, test booking, student registration or payment is automatically created.

### Required configuration before test traffic
Set these in the **staging Lovable frontend**:
- VITE_TURNSTILE_SITE_KEY — public Cloudflare Turnstile site key for the exact staging hostname.

Set these **server-side in staging Supabase Edge Functions only**, never in React or GitHub code:
- TURNSTILE_SECRET_KEY — matching private Turnstile verification key.
- TURNSTILE_ALLOWED_HOSTNAMES — explicit comma-separated allowlist of legitimate staging hostnames; no protocol or wildcards.
- ENQUIRY_QUOTA_PEPPER — randomly generated 32+ character server-only pepper, retained securely across restarts.
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — supplied securely by the actual staging Supabase environment; never share secret with browser.

The Turnstile challenge must use the action 'unipathway-enquiry'. Use https://challenges.cloudflare.com/turnstile/v0/siteverify on the server. Do NOT allow test tokens or Cloudflare demo site keys in production.

### Database migration
- supabase/migrations/20261017211500_public_enquiry_abuse_guard.sql
  - public.unipathway_enquiry_quotas: private hashed buckets, RLS on, no anonymous/authenticated table access.
  - public.consume_unipathway_enquiry_quota: RPC executable only by service_role.
  - PGlite regression: scripts/test-unipathway-enquiry-abuse-db.mjs.
- Purge quota buckets older than 14 days using a separately approved service-role maintenance job:
  DELETE FROM public.unipathway_enquiry_quotas WHERE bucket_start < now() - interval '14 days';
  Do not make this callable by public or student roles. This is a required retention launch action, not currently scheduled.
- Challenge credentials and separate domain settings are still needed. Without them, online forms intentionally fail closed. Provide an ordinary approved contact channel as fallback.

## Staging acceptance gate
This is **read-only**; it does not create users, upload audio, mutate records, or apply migrations.

Source:
- scripts/verify-unipathway-staging.mjs
- .github/workflows/unipathway-staging-acceptance.yml (manual workflow)
- src/test/unipathway-staging-guard.test.ts

### Required staging environment inputs
Use a protected GitHub Environment called 'unipathway-staging'. Restrict it to trusted branches and authorised reviewers.

Environment variable:
- UNIPATHWAY_STAGING_PROJECT_REF — confirmed *new isolated staging* Supabase project ID/reference, independently verified as non-production.

Protected secrets:
- UNIPATHWAY_STAGING_URL — exact https://<reference>.supabase.co of staging (not Lovable production).
- UNIPATHWAY_STAGING_ANON_KEY — staging publishable/anon key, never service role.
- UNIPATHWAY_STAGING_FIXTURES_JSON — non-production synthetic test fixtures as shown below.

Run workflow with input confirmation **UNIPATHWAY_STAGING_ONLY**. This file currently lives on the feature branch; workflow_dispatch may require the workflow to exist on the repository's default branch before the UI offers it. Run the node script locally with approved staging secrets if testing before merge.

Fixtures example — replace placeholders with TWO distinct staging tenants and real pre-created synthetic accounts/IDs; do not paste actual passwords into a source repository:
  {
    "tenantA":"<staging-tenant-A-uuid>",
    "tenantB":"<staging-tenant-B-uuid>",
    "studentA":{"id":"<uuid>","email":"student-a@staging.example","password":"<protected test password>"},
    "studentB":{"id":"<uuid>","email":"student-b@staging.example","password":"<protected test password>"},
    "tutorA":{"id":"<uuid>","email":"tutor-a@staging.example","password":"<protected test password>"},
    "planA":"<owned IELTS plan UUID>",
    "planB":"<different-tenant plan UUID>",
    "audioA":"<own speaking row UUID>",
    "audioB":"<foreign speaking row UUID>",
    "audioPathA":"<tenant-A>/<student-A>/<uuid>.webm",
    "audioPathB":"<tenant-B>/<student-B>/<uuid>.webm",
    "academicA":"<verified and student-visible academic route UUID>",
    "academicB":"<other-tenant verified route UUID>"
  }

The gate requires successful authenticated access to the expected OWN rows and rejects visibility of other tenant rows for students and a tutor. It separately verifies short-lived private audio links cannot be signed across tenants.

The script rejects:
- Missing or incorrect staging-only acknowledgement.
- Missing test credentials or fixtures.
- Mismatched URL hostname and explicitly approved staging project reference.
- The ambiguous checked-in project ref 'sthrhcmjypwuorlbscfw' until separately verified. This is a deliberate fail-closed guard.
- Any failed two-tenant access-control check.

**No actual staging acceptance has run yet** because the target database has not been identified/provisioned and test account credentials have not been supplied.

## Pre-merge test suite
- npm ci --ignore-scripts
- npx tsc --noEmit -p tsconfig.app.json
- npm run lint
- npm run check:intelligence
- npm run check:enquiry
- npm run test:db
- npm run test
- npm run build

The feature branch has been reconciled to include the latest STEMCoach published-origin security fix. The main branch, hosted Lovable preview and any real university records are not modified by the reconciliation.

## Remaining sign-off
1. Independent staging database identification and backup. Apply migrations in canonical timestamp order to **staging** only, validate RLS, triggers, private storage policies and Edge Function credentials with real Auth JWTs.
2. Test both public forms with an actual Turnstile challenge on a controlled host, quota overrun, disabled network, duplicate submissions, failed service, and admissions CRM delivery.
3. Test protected accounts: ordinary student A, student B from another tenant, centre tutor A, admissions, centre director, exams officer and finance; check read/write/negative cases.
4. Confirm external enquiry → verified account → manually approved service activation → actual optional IELTS LMS entitlement. Do not allow unsolicited external signup to bypass paid-course policies.
5. Full mock and Speaking capture on Chrome/Edge/Safari mobile and desktop; consent, format compatibility, storage expiry and removal.
6. Verify each OTHM/Qualifi receiving university programme and published English requirements from authoritative written evidence. Verify that signed university agent commission contracts are separate.
7. British Council agent training, IELTS registration partnership and IELTS testing venue are three different relationships. Display logos only with individual written licensing/branding permission.
8. Obtain business and education data retention/privacy approval, establish quota cleanup, and verify refunds/clawbacks and bank-payment reconciliation.
9. Merge PR only after all high-risk staging tests and approval. Publishing from Lovable is a separate explicit action.

