# UniPathway x STEMCoach authenticated centre launch phase — 17 Oct 2026

The existing UniPathway/EDUCLOUD education platform retains admissions, verification, regulated academic assessment and student records. STEMCoach retains tutoring, exam practice and its separate institution membership.

This phase ships a centre-scoped, operator-verified launch into the existing STEMCoach request-to-join workflow.

- New private stemcoach_centre_links table, RLS enabled, with no anon/authenticated read/write privileges.
- An operator (not a learner, teacher or browser) inserts/activates the verified source-tenant -> STEMCoach institution-slug association only after independent school/centre ownership validation, recording the verification reference/time.
- An authenticated RPC returns a slug only when the student's OWN UniPathway profile tenant agrees with an ACTIVE enrolment in that tenant and an active verified link exists.
- The student dashboard displays a link only after the server RPC validates it. The URL contains only the approved public STEMCoach institution code.
- The user signs into STEMCoach separately and its institution admin must approve membership. There is no automatic seat/billing/entitlement, SSO token or silent grade sharing.
- Access to regulated OTHM/Qualifi assessment is unchanged; no AI marker is enabled.

Staging acceptance: unverified centre, missing active enrolment, foreign centre/profile mismatch, anonymous caller, disabled binding, unauthorised table write, malicious URL, missing RPC, and verified active learner.

Next phases: explicit board/course mapping, audited one-time signed federation handoff, replay-safe revocation, verified entitlements and optional consented, minimal learning progress events via Omniqora. No provider integration, migration deployment, or publication was performed just by merging this code.

Operator note: Only a verified published STEMCoach HTTPS origin explicitly configured in VITE_STEMCOACH_APP_URL is accepted. Never infer production from a Lovable preview; missing URL must hide the link.
