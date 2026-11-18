# UniPathway — Phase 14: coursework history and feedback clarity

**Date:** 18 November 2026  
**Scope:** authenticated student coursework dashboard, read-only evidence verification and accessible learning cards.

## Implemented
- Reject attempts with a number beyond the currently published brief limit, missing earlier attempts, or an unsubmitted draft status. Duplicate IDs and duplicate attempt numbers remain rejected.
- Treat inconsistent attempt histories as **unavailable**, not zero completed attempts or a valid resubmission recommendation.
- Show submitted coursework awaiting human assessment/IQA separately from independently released feedback, with named links into the authorised assignment and grades workspaces.
- Bound summary cards to three rows in each state and preserve the existing all-workspace links, Pakistan-time date guidance, data-scope filtering and read-only nature.
- Add deterministic unit and React regressions for missing/out-of-policy attempts, draft records, mixed review/release states and error handling.

## Boundaries and deployment
- No schema, enrolment, RLS, privilege, assessment write or Microsoft integration changes.
- Any read-only dashboard hint must be rechecked by the authenticated submission and approved-result workflows; this does not confer marking, IQA, or release permission.
- PR CI must pass. Production migration reconciliation, two-centre authenticated staging, real-screen mobile accessibility and provider activation remain separate release gates.
