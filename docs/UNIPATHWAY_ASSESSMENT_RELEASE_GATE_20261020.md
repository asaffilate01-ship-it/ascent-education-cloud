# UniPathway — independent assessment, formal appeals and protected result cutover
**Development gate:** draft PR #47. **Not live / not published.** This document covers the next implementation phase following the original roles and Teams/LMS audit.

## Academic assessment sequence
1. **Lecturer** records the lessons, teaching progress, official/locally verified learning outcomes, expected student work, evidence standards and draft criterion rubric.
2. **Programme Leader / Centre Director** approves the complete 100-point rubric, submission deadlines, number of permissible attempts, any penalty points and the applicable *verified* scheme reference **before** learners see it. An awarding body's rules override any centre default. Some programmes may prohibit deductions entirely.
3. **Enrolled student** submits evidence. Revisions are allowed only where the allocated independent assessor issues individual written guidance, the published cutoff has not passed and the permitted attempt count is not exceeded. No automatic "improve your grade as much as you like" loop.
4. **Programme Management** assigns an authorised **independent assessor**, different from the teaching lecturer and submitting learner, plus a different **IQA**. The self-assignment or dual assignment RPC rejects role/tenant conflicts.
5. **Omniqora Intelligence**, *only when institutionally enabled under approved student-data privacy and provider terms*, may prepare an **advisory** criterion-by-criterion report identifying verbatim evidence, missing work, tentative points and feedback. Unverifiable citations and out-of-range suggestions are rejected. The AI neither marks final grades nor determines misconduct.
6. **Human assessor** scores every frozen criterion, explains the mark with attributable evidence, describes what's missing and signs their feedback. The DB calculates any approved resubmission deduction transparently.
7. **Separate allocated IQA** checks the evidence and human marker against the versioned rubric, approves or returns the assessment for correction. Revisions are preserved in mark history.
8. **The same allocated IQA explicitly releases** the approved result. Student pages, aggregate dashboards and gradebook routes read **only the released-results table**, never AI drafts or raw/provisional legacy submission grades.

## Fairness and calibration requirements before live pilots
- Blind/anonymised marker references where compatible with evidence types; no personal attributes should inform a criterion mark.
- Programme-specific marking schemes: Pakistan board mock percentages, Cambridge grade thresholds, CEFR skill bands, practical competency, professional exam pass criteria and OTHM/Qualifi criteria are **not interchangeable**. Internal points must not be misrepresented as official examination awards.
- Two teaching/marking roles and separate IQA; direct lecturer grade writes are disabled at the staging cutover. A second opinion for borderline or disputed work is recommended.
- Different lecturers use the same rubric and keep a moderation/calibration record, including marker variance, override reasons and audit history. The platform must not automatically penalise learners for estimated AI probability or similarity scores.
- Explain supported accommodations and special consideration through an approved confidential policy, not unreviewed AI assumptions. If learners are minors, assess lawful guardian access, consent and safeguarding separately.
- Appeal rights, resubmission rights, deductions and windows require qualification-specific written rules approved by the centre before student submission or released results, as applicable.

## Formal grade appeal
- Student may request one documented appeal for their own **released** assessment only when an approved brief-specific appeal window exists.
- A separate IQA (not lecturer, initial marker, initial IQA or student) checks the original coursework, rubric, released mark and evidence.
- An independent Centre Director who did not teach, mark, release, assign or review the case records final sign-off.
- The original released result remains immutable. A correction is written as a separate signed `unipathway_assessment_grade_amendments` record; the original policy penalty is retained unless a different authorised appeal process is implemented.
- Student results use the signed effective score and show the original-versus-amended audit history. A rejected recommendation is referred without altering the original grade.
- **External awarding-body appeals, special consideration, examination entries and grade changes** must still follow that body's applicable procedures; local platform outcomes do not substitute for official decisions.

## Security cutover and data migration
The previous `submissions` table included directly readable `grade` and `feedback` columns. As of the October audit, its live RLS let students read their own raw submission row, even before independent moderation. This makes UI hiding insufficient.

Staging migration `20261020180000_legacy_submission_grade_cutover.sql` deliberately removes every permissive legacy submission policy, blocks student/lecturer use of the old table and permits **director-only archival reads** plus authorised global superadmin audit. Existing legacy records are **not deleted**. This migration is **not safe to publish before** historic submissions and any current live learning journeys are reconciled into the new workflow, backup is complete and staff can still lawfully retain/export the records they need.

The legacy generic `/gradebook` and both student dashboards have been redirected/updated to avoid direct provisional-grade display. All unofficial grade and feedback fields should be reviewed through negative browser/account tests before release.

## Tests and release gate
- `scripts/test-unipathway-independent-assessment-db.mjs` uses real Postgres RLS in PGlite with separate lecturer, programme leader, enrolled student, another student, independent marker, first IQA, second IQA, director and unrelated tenant. Exercises submission, marker allocation, resubmission policy and point loss, approval, release, appeal, amendment and student-only visibility.
- `scripts/test-unipathway-legacy-grade-rls-db.mjs` reproduces the legacy provisional mark exposure in a synthetic fixture, then tests that the archival cutover blocks student/lecturer reads and direct writes without deleting the rows.
- `src/test/unipathway-independent-grade-appeals.test.ts` and other contract/unit tests guard specific route/RLS design decisions. **PGlite fixtures do not certify every live Auth/PostgREST, Storage and browser variant.**
- CI on exact head SHA must pass: `npm ci`, build, TS, lint, unit, DB fixture, Edge checks and browser acceptance.
- Before merge, apply all missing migrations in an isolated two-tenant staging environment; seed role-correct non-shared test accounts; run actual authenticated HTTP tests using Student, Lecturer, Assessor, IQA, Programme Leader, Director and third-party cross-tenant user. Verify each RLS policy denies unintended operations and upload/download access.
- Run manual moderation and appeal scenarios with representative Pakistan SSC/HSSC, Cambridge, language and diploma marking schemes, including a 0-mark case, high mark, partial mark, absent evidence, missed cutoff and disputed penalty.
- Confirm formal policy, instructor/marker staffing, awarding-body obligations, retention/deletion procedures, malpractice investigation controls and appeals contact information.
- **Do not enable Omniqora assessment** or send student work to any AI provider until data governance, secure tenant isolation and proper provider/learner agreements are approved.
- **Do not publish the draft PR or mutate production tables automatically.** Follow staged migrations, data checks, written approval, rollout and rollback.

GitHub source: `asaffilate01-ship-it/ascent-education-cloud`, PR #47.
