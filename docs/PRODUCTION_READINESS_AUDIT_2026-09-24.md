# Production Readiness Audit — 24 September 2026

## Executive status
The product has broad UI coverage, but it is not production-ready for regulated academic delivery yet. Existing pages include student, lecturer, parent, centre director, tenant admin, superadmin, QA, exams, finance, employer, university partner, residential, compliance, audit, gradebook, course builder and progression experiences. The next work is enforcement and wiring: server-side role/tenant isolation, controlled assessment states, verified human approval, awarding-body access, evidence-grade audit, course governance, and end-to-end tests.

## P0 — Security / tenant isolation
- Define canonical tenant membership and role tables. Never trust UI RoleGuard as authorization.
- Add explicit RLS policies for every sensitive table and storage bucket: profiles, submissions, gradebook, attendance, invoices, health, documents, parent links, progression, referrals, assessment/IQA records, identity, messages and audit.
- Negative tests: user from tenant A cannot SELECT/INSERT/UPDATE/DELETE tenant B records.
- Parent access must require a verified parent_student_link and expose only permitted child fields.
- Lecturer/assessor access must be limited to assigned cohorts/modules/submissions.
- University partners can access only referrals explicitly assigned to their institution.
- Awarding-body/EQA accounts are read-only and scoped to approved centre/qualification/evidence packs.
- Service-role Edge Functions must independently authorize every mutation.
- Add webhook idempotency/event ledger; signature verification already exists but duplicate Stripe events must not duplicate state/actions.
- Make audit events append-only to normal application roles; log grade changes, IQA decisions, identity changes, permissions and exports.
- Enforce MFA for privileged roles and session/security controls.
- Run dependency/secret scanning and remove/rotate any previously committed secrets.

## P0 — Assessment / AI grading
Current UI can write a grade directly to submissions and gradebook. AI grading currently receives metadata/context and generates prose/grade-band feedback. This is not sufficient for controlled summative marking.

Required workflow:
SUBMITTED -> INTEGRITY_CHECKED -> AI_DRAFTED -> ASSESSOR_REVIEW -> ASSESSED -> IQA_SELECTED/NOT_SELECTED -> IQA_APPROVED -> RELEASED

Rules:
- AI never releases a grade and never overwrites the human decision.
- AI must grade against the exact qualification specification version, unit, learning outcomes, assessment criteria, approved brief and rubric.
- Feed the actual learner submission, not only student name/word count/plagiarism score.
- Structured output per criterion: evidence citation/page/paragraph, criterion decision, rationale, confidence, missing evidence, suggested feedback and suggested overall result.
- Assessor sees AI suggestion only as decision support; assessor accepts/edits/rejects each criterion and signs the final decision.
- Record human/AI disagreement and rationale. Use this to monitor bias, drift and assessor consistency.
- Low confidence, integrity flags, unusual grade deltas and boundary cases automatically require enhanced review.
- IQA is independent and cannot be the assessor.
- Result release is a server/database transition after required QA, not a client-side status update.
- Never infer misconduct from an AI-detection percentage alone; route integrity concerns to human review.
- Version model, prompt, rubric, specification and source pack for reproducibility.
- Create an AI grading evaluation set of double-marked scripts and measure agreement, false pass/fail, subgroup fairness where lawful, and criterion-level error before production use.

## P0 — Roles and dashboards
Required first-class roles:
- Platform Owner / Superadmin
- Centre Owner / Director
- Tenant Admin / Operations
- Academic Director / Programme Lead
- Lecturer / Tutor
- Assessor
- IQA / Head of Quality
- Registry / Exams
- Admissions
- Finance
- Careers / Progression
- Employer
- University Partner
- Awarding Body / EQA read-only
- Student
- Parent / Guardian
- Welfare / Nurse (restricted health scope)
- Agent

Each role needs route guard + database RLS + action authorization + scoped dashboard. Multi-role staff may hold several roles but permissions are additive only through explicit grants.

## P1 — Dashboard completion
### Student
Timetable, live classes, course content, attendance, submissions, released grades, feedback, fees, documents, centre weeks, accommodation, progression, careers/internships, messages/support.

### Parent
Verified child link, attendance, released results only, fee status, centre-week/accommodation notices, progress alerts and messaging. No access to private welfare/health or draft assessment records unless explicitly lawful/authorised.

### Lecturer
Assigned classes/modules only, teaching packs, attendance, workshops/labs, student support, formative work and academic alerts. Separate lecturer from summative assessor permission.

### Assessor
Assigned scripts, submission viewer, specification/LO/AC/rubric, integrity report, AI draft, criterion decisions, feedback, assessor declaration, SLA/workload.

### IQA
Risk sampling, assessor matrix, blind/targeted sampling, criterion comparison, actions, standardisation, appeals, release gate and EQA pack.

### Owner/Director/Admin
Capacity, enrolment, staffing, finance, quality, risks, compliance, centre weeks, accommodation, progression and partner performance.

### Awarding body / EQA
Read-only qualification/cohort/staff/assessment/IQA evidence, sampling exports, audit history and requested evidence. No general tenant administration.

### University partner
Only referred students assigned to that partner, documents authorised for sharing, offer workflow and commission reconciliation.

## P1 — Courses / Course Factory
- Import controlled qualification specifications with version/effective dates.
- Qualification -> unit -> LO -> AC -> indicative content -> GLH/TQT -> assessment method.
- Scheme of Work builder and coverage validator.
- Teaching pack: lesson plan, slides, lecturer notes, student notes, reading, seminar, workshop/lab, quiz, formative activity.
- Resource licensing/reading-list register.
- Academic workflow: DRAFT -> SME REVIEW -> PROGRAMME LEAD -> QA APPROVED -> PUBLISHED.
- Change-impact analysis when specification changes.
- Lock controlled summative briefs from unauthorised AI rewriting.
- Course completion/coverage report for approval/EQA.

## P1 — Compliance
- Policy register with owner/version/review/acknowledgement.
- Staff competency files: CV, ID, verified qualification, references, subject approval, assessor/IQA qualification, CPD and expiry/review dates.
- Learner identity/qualification verification and retention rules.
- Safeguarding/welfare and restricted health records.
- Complaints, appeals, malpractice, reasonable adjustment, special consideration, RPL and conflict workflows.
- Data retention/deletion, subject access/export and consent/legal-basis records.
- Incident/breach register and business continuity/DR evidence.
- Residential safeguarding, accommodation allocation, emergency contacts and incident management.

## P1 — Functional flows
- Admissions -> eligibility -> verification -> offer -> payment -> enrolment -> awarding-body registration.
- Enrolment -> timetable -> attendance -> learning -> centre weeks.
- Submission -> integrity -> AI draft -> assessor -> IQA -> release -> appeal/resubmission.
- Completion -> claim/certificate -> university progression -> referral -> offer -> enrolment -> commission.
- Careers -> internship/job -> match -> interview -> offer -> placement -> employer feedback.
- Parent linking and consent/verification.
- Centre-week capacity, male/female accommodation allocation, meals, transport, events and welfare.

## P1 — Testing / operations
- Unit tests for permission helpers and grade-state machine.
- RLS integration tests for every role and cross-tenant negative cases.
- E2E tests for each critical lifecycle.
- Load test 3,000 active students plus peak centre-week/assessment activity.
- Backup restore drill and RPO/RTO evidence.
- Monitoring, alerting, error tracking and operational runbooks.
- CI required checks before merge/deploy.

## Existing strengths observed
- ProtectedRoute and RoleGuard exist at UI level.
- Dedicated Student, Lecturer, Parent, Director, Tenant Admin, Superadmin, QA, Employer and University Partner screens exist.
- AI course builder and AI grading assistant Edge Functions exist and authenticate requests.
- Stripe webhook verifies HMAC signature and rejects stale events.
- Audit log UI exists.
- Parent/student linking, gradebook, progression, residential, compliance, exams, finance and notification surfaces exist.
- PR #2 adds production-schema primitives for assessment/IQA, progression/referrals, employer opportunities, expo events, curriculum outcomes and identity review.

## Critical gaps observed
- LecturerMarking currently updates submissions directly to status=graded; the displayed claim that IQA happens before release is not enforced by that code path.
- QADashboard derives moderation status from submission status/plagiarism and contains UI claims for auto-sampling and release enforcement; those controls need real database/server workflows.
- Gradebook permits staff-side direct grading; it must be integrated with the controlled assessment/release state machine.
- AI grading currently does not ingest the complete submission + exact controlled rubric/LO/AC evidence and returns unstructured feedback; it is advisory only.
- UI route guards are not a substitute for database RLS.
- Stripe signature/replay checks exist, but a persistent event-id idempotency ledger is still required.
- PR #2 remains a foundation branch; its tables still need canonical tenant RLS policies and UI wiring.

## Release gates
No production go-live until:
1. RLS matrix passes cross-tenant tests.
2. Grade release cannot bypass assessor/IQA policy.
3. AI marking evaluation and human-signoff workflow pass.
4. Critical E2E journeys pass in CI.
5. Backup restore test succeeds.
6. Privileged MFA and audit controls are verified.
7. Course specification/version coverage is complete for every launched qualification.
8. Compliance evidence room is complete and exportable.
