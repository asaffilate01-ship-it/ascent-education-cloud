# UniPathway — independent IQA audit reviewer assignment proposals

This source phase builds the second part of the fortnightly IQA audit process. It is **not** a deployed service, cron job or authorisation system.

1. A previously approved, complete and current-centre sampling population is passed to a pure function.
2. An identity/qualification source trusted by the server must verify each proposed reviewer before their staff record is passed into this planner. The function only considers active, IQA-role reviewers with explicit awarding-body, qualification, level, subject and assessment-method competence.
3. Each candidate's original assessor and independent IQA approver are excluded from the subsequent audit. An explicit case conflict also excludes a reviewer.
4. For eligible reviewers the planner chooses the least-loaded available reviewer with a stable tie-break. It returns only anonymised attempt references, reviewer references and selection reasons.
5. **If even one sampled assessment lacks an independently eligible reviewer, the entire proposal is blocked with no partial assignments.** An unapproved proposal must never be treated as work issued or graded.
6. The result remains `proposal-needs-independent-approval`; a separately authenticated, competent, independent human reviewer and director/quality lead must approve any future allocation, policy and conflicts before writes.

## Production blockers
A trusted server-side membership/qualification verification system, sealed sample population, awarding-body specific policy, reviewer evidence, competence expiry, out-of-scope staff rejection, staging RLS and immutable audit records are still required. No hosted migration, new table, API access, sampling cron, automatic IQA decisions, grade changes or EQA sharing was made.

The existing first-line independent assessor/QA mark release rules remain authoritative. Tests cover independent reviewer selection, balanced allocation, no-self-review, conflicts, active role and qualification competence, foreign-centre rejection, duplicate rows and all-or-nothing shortfalls.
