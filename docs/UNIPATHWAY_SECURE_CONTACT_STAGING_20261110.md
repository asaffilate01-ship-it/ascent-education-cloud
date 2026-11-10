# Secure general UniPathway contact — staging-only source phase (10 November 2026)

## Objective
Replace the older anonymous `contact-form` pathway for public UniPathway enquiries with a fail-closed, authenticated-by-challenge server intake when the operator explicitly enables it. The older endpoint presently uses a process-local IP rate limiter and is *not* considered equivalent to the verified public international enquiry service.

## Source delivered (not deployed/activated)
- `supabase/functions/unipathway-secure-contact/index.ts` only accepts `POST`, fixed `tenant_slug=unipathway`, tightly validated subject, bounded name/email/phone/message, a privacy notice acknowledgment and a server-verified Cloudflare Turnstile token.
- Requires `TURNSTILE_SECRET_KEY` and exact `TURNSTILE_ALLOWED_HOSTNAMES`; Turnstile action must equal `unipathway-enquiry`. Missing/failed verification always rejects; never trusts a client boolean.
- Requires `ENQUIRY_QUOTA_PEPPER` and the service-role-only `consume_unipathway_enquiry_quota` RPC used by the existing independent public enquiry implementation. A missing RPC or secret fails closed. Hashes the lowercased email with the private pepper; no raw email is used as the quota key.
- Looks up a **fixed** UniPathway centre slug using the service client, writes a lead only after verified challenge/quota/tenant and returns an explicit success receipt without exposing private records. No KYC, grade, application decision or payment is created.
- The frontend switches to this endpoint only if `VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED=true` **and** it is the UniPathway public tenant. The secure form then requires privacy acknowledgment and a Turnstile token before submission. Other tenant forms and default UniPathway behaviour remain unchanged to avoid disrupting live leads prior to credentials.
- New Deno parser tests and frontend synthetic receipt tests, included in CI.

## Real activation blockers
**Read-only inspection on 10 November 2026 showed that the named durable quota RPC was absent in the connected Lovable database.** Do not enable the secure frontend flag until that migration has been reconciled and applied to isolated staging, a proper restore baseline exists and two-centre permission tests have passed.

Release sequence:
1. Provision and review Cloudflare Turnstile public site key and secret; set allowed hostnames to the exact UniPathway domains. No secrets in GitHub or browser output.
2. Review and apply the existing `20261017211500_public_enquiry_abuse_guard.sql` **only** through the reconciled forward-only deployment process, after staging backup and migration parity checks. Do not replay fresh-staging replacements in production.
3. Deploy the Edge function to staging; prove CORS, invalid/expired token, cross-host action, forged tenant, quota contention, duplicate request, no-secret, unknown tenant and malformed receipt failure modes. Do not use real student data for tests.
4. Provide `VITE_TURNSTILE_SITE_KEY` in the public staging build, enable `VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED=true` there, and verify a synthetic live receipt.
5. Review privacy, retention, marketing opt-in (not implied by privacy acknowledgement), communication delivery and data-processing roles, then separately approve production activation.
6. Decommission the legacy open UniPathway contact endpoint only after measuring adoption and making sure other supported tenants have a safe equivalent; never break unrelated tenant forms without replacement.

## Security truth
This PR is **source only**. A green CI run does not verify live Turnstile, durable quota, CORS, production Edge deployment, personal-data retention or individual admissions use. The new endpoint is not an application, qualification offer or enrolment service.
