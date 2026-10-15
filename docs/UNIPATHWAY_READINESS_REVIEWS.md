# Launch readiness evidence reviews

Directors and superadmins can record centre-scoped reviews on Production Readiness. Pass decisions require an evidence reference and a future review deadline. Fail, blocked and not-applicable decisions require a reason; exemptions also require evidence. Expired passes remain outstanding. Missing baseline gates and unverified required integrations block completion.

The review RPC locks the check and compares its revision, assigns the reviewer and timestamp server-side, and appends an immutable audit snapshot. Stale submissions fail without overwriting another review. Direct authenticated writes are denied. The screen retains rejected form entries and offers explicit refresh; the audit view shows the latest 20 decisions per check.

Apply `20261015212552_readiness_evidence_reviews.sql` after the existing launch gate baseline. Generated education types include the new fields and review table. No integration health can be changed by this review workflow.

Validation uses the repository's PGlite database fixture, unit tests, TypeScript, build and lint. It does not establish a full historical Supabase migration replay, real browser role isolation, private Storage HTTP behavior or production readiness. No live migration, deployment, provider connection or academic approval is performed by this change.
