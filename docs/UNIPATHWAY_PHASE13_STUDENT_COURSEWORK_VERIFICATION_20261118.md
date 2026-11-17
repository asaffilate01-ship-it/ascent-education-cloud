# UniPathway — Phase 13: complete, source-verified student coursework agenda

**Scope:** React student dashboard coursework list and focus recommendations, 18 November 2026.

## Finding
The student dashboard previously used RLS-scoped and tenant-filtered queries for assessment briefs, attempts and released results, but did not independently validate the returned rows. Inconsistent or foreign rows could affect an actionable count, remaining-attempt guidance or independent-release summary before the learner reached the authorised coursework workspace.

## Implemented
- Query published briefs with tenant/status provenance, verify the **entire** paged snapshot against the active centre and enrolled module IDs, and only then use verified brief IDs in dependent queries.
- Query student-owned attempts with student and tenant fields, and verify unique attempt IDs/numbers, originating briefs, owner, centre, and valid status/attempt number.
- Query independently released receipts with student and tenant fields. Every release must map to an actual student-owned attempt for the same brief; reject mismatches and duplicates.
- If any row is invalid, the dashboard shows the existing coursework **unavailable / Refresh** state; it does not display counts, links tied to unverified coursework, or a suggested study focus. Class-session read state remains independent and still requires an actual invitation to join.
- Preserve inconsistent academic date text as a **verify dates** guidance rather than claiming eligible submission; the full coursework page and authenticated RPCs still decide permissions and independent IQA releases.
- Add source-shape and React regressions for centre and learner separation, attempt duplication, mismatched releases, failure recovery and happy-path classification.

## Scope boundaries
No schema, RLS, enrolment, grading, signing, AI marking, scheduling or Teams integration change. This is defence in depth for read-only guidance, not a replacement for server authorisation or independent IQA.

## Release gates
Exact-head TypeScript, ESLint, full Vitest, DB/RLS, Edge, browser, Android/iOS and design checks. Only green CI validates the source change; real signed-in two-centre staging, source migration parity and physical-device acceptance are separate from merge or live deployment.
