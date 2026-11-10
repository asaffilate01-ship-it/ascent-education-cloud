# UniPathway fortnightly IQA audit: staged core (10 November 2026)

## Status
**Source-only, not activated.** The new `src/lib/qa/fortnightlySampling.ts` produces a reviewed, non-persistent proposal from supplied *already released and approved* attempt metadata. It does not fetch records, schedule jobs, select an IQA reviewer, issue approvals, change marks, or expose student files. The existing per-attempt independent IQA gate before release remains authoritative. This is additional second-line quality monitoring, not a replacement.

## Operational policy
- The centre's approved IQA lead owns an awarding-body- and qualification-specific sampling policy. Do not impose a universal 10%, 20% or 25% rate: the awarding body's current approval documents, qualification design and centre risk dictate minimum coverage.
- Run fortnightly in Pakistan time after each cycle closes. Convert inclusive local cycle start and exclusive cycle end into offset-aware instants for audit; retain the exact source record version.
- Pull the complete authorised centre, awarding body, assessment status and cycle from server-side records, not a browser-built list. Include high-risk reviews from *documented human-approved risk reasons* (new assessor, previous disagreement, unusual resubmission, practical method, etc.); AI similarity flags are not a misconduct finding.
- Best-effort diversity must span qualification levels, subjects, original assessors and assessment methods. A small sample cannot promise to cover every group. Report every missing group to the IQA lead for a larger risk-informed follow-up.
- Sample early/interim work where the relevant awarding body requires it; this separate post-release cycle cannot substitute for initial assessment/brief verification, standardisation, observations or mandatory programme-specific verification.
- No one may check their own assessed work. The eventual reviewer allocation must verify separate active role, centre and subject competence and prevent conflicts.
- An approved sampler must record reviewed marks, criterion evidence, feedback quality, corrections, assessor coaching, appeal links, standardisation actions and a dated completion receipt. Audit preparation never releases changed grades automatically.

## Server integration still required
1. Define tables in a **forward-only staged migration** for policy revisions, cycles, encrypted/unpredictable server draw provenance, selected attempt references, reviewer allocations, outcomes, actions, completion and immutable audit events. No hosted DDL is included in this phase.
2. Add one transactionally safe authorised backend RPC/job that performs complete, paginated, tenant/RLS-scoped eligibility extraction, then calls the pure selector with a server cryptographic random source and stores a unique per-cycle proposal. Prevent duplicate or partial cycles; record population counts, policy version and a selection digest.
3. Require an independently verified IQA/centre-director confirmation before distributing a proposal. Allocate reviewers with server-side conflict checks and auditable expiry; never leak student names, scripts, identifying documents or grades in proposed lists.
4. Provide an accessible `/qa/sampling` workspace with approval, sampling matrix, comparison, coverage shortfalls, risk escalations, reviewer timesheets and corrective action queues. It must distinguish **not configured**, **failed**, **no eligible records**, **proposal**, **approved**, **under review**, **signed off**. A disabled route must never claim audits are happening.
5. Add external EQA evidence sharing only after approved time-bounded centre/qualification access and evidence redaction, with all reads logged.
6. Validate awarding-body policy with the organisation's latest official guidance before activating any qualification or claiming equivalence.

## Negative acceptance cases
- Deny requests for other tenant / inactive role / revoked reviewer / same-assessor reviewer / unrelated awarding body.
- Never draw against a partial/missing database page or treat an unknown source as zero.
- Repeated schedule invocations produce one cycle (idempotency), not a new random selection with different sampled learners.
- Policy changes and appeal-related corrections create a new auditable revision, not silent mutation.
- Mixed centres, duplicate attempts, invalid timestamps, ambiguous policy and untrusted random values fail closed (covered by pure unit tests).
- Browser and native experience: 360, 390, 768, 1440 px, 200% zoom, keyboard, screen reader, low bandwidth and recovery after interrupted writes.

## Relevant official guidance
- Pearson UK roles: https://qualifications.pearson.com/en/support/support-topics/quality-assurance/btec-quality-assurance-handbook/roles-within-your-btec-team.html/EO
- SIA licence-linked course trainer requirements (separate regulated delivery): https://www.gov.uk/guidance/teaching-sia-licence-linked-training-courses

No AI or MCP tool may call privileged writes or bypass the authenticated service/RLS boundary. Student welfare and misconduct decisions stay human-led.
