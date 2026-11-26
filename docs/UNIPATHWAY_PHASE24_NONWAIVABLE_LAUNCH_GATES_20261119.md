# UniPathway Phase 24 — non-waivable launch evidence

**19 November 2026 — source-only evidence and UI hardening.**

## Finding
The readiness overview treated a reviewer-recorded `not_applicable` row as current evidence if it had a reviewer, reference, and explanatory note. That policy is appropriate for an approved out-of-scope capability, but unsafe for essential cross-centre isolation, backup/recovery, migration parity, controlled academic entry and publication signoff. A set of local waivers could make the counter show all gates complete while critical controls remained untested.

## Changes
- Define an explicit, source-reviewed list of 14 essential go-live gates that require a current, evidence-linked **PASS**, not merely a justified `not_applicable` review. Other listed capabilities (such as NADRA/CCTV for an online-only pilot) retain the existing documented exception mechanism pending owner approval.
- Introduce `readinessCheckCurrent` to apply this rule, preserving `evidenceCurrent` for independent evidence-record semantics.
- Use the stricter decision for dashboard summaries and individual status labels; expose an accessible warning when a critical check is marked `not_applicable`. Do not imply that source CI authorises launch.
- Add tests for all required keys, optional waivers, expired/unreferenced evidence, provider isolation and the review UI.

## Remaining controls, explicitly not performed
Real two-centre JWT/RLS and Storage negatives, function grant review, monitored staging restore, migration reconciliation, approved qualification and course records, provider contracts, staff competence and centre-owner signoff remain P0/P1. The read-only source change does not alter SQL permissions, official approvals, active database readiness rows, published site or provider health.

## Release gate
Exact-head 11-check CI on GitHub, plus source-code review. Real user sessions, physical Android/iOS and accessibility audits remain separate from any merged code.
