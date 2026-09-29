# Security & Workflow Control Matrix

## Non-negotiable security boundaries
- Tenant isolation is enforced in database RLS, never only in React route guards.
- Students may access only their authorised academic/finance/profile data.
- Parents/guardians require a verified relationship and receive only the approved child view.
- Lecturers teach and provide formative support; they cannot release summative grades.
- Specialist markers see only allocated assessment material and the minimum student identity required by policy.
- IQA controls sampled/required verification and grade-release gates.
- Awarding-body/EQA access is evidence-scoped and auditable.
- Employers see their own corporate training records and consented/relevant recruitment applications only.
- Finance can manage payments but cannot change academic decisions.
- Client/browser actions cannot mark online payments settled.
- Microsoft/NADRA/payment secrets stay server-side.
- Sensitive documents use private storage and time-limited authorised access.

## Core workflows
Admissions: application -> KYC/education evidence -> eligibility -> offer -> acceptance -> payment/funding -> enrolment -> student identity.
Teaching: approved course -> cohort -> timetable -> lecturer/moderator -> Teams class -> attendance/artifacts -> reviewed lesson pack.
Assessment: submission -> integrity signals -> specialist marker -> feedback/resubmission where allowed -> final marking -> IQA -> authorised release. AI assists; authorised humans decide.
Payments: order -> payer allocations -> provider/manual transaction -> signed webhook or finance reconciliation -> settlement -> invoice; refunds append audit records.
Vocational: enrolment -> practical partner -> logbook/evidence -> supervisor sign-off -> qualified assessor -> outcome -> required QA/certification.
Corporate: employer contract -> course offer -> seat allocation -> employee enrolment -> delivery -> assessment/completion -> employer report.
Microsoft: admitted/enrolled -> account request -> licence/mailbox/Teams -> secure activation/MFA -> active -> graduate/withdraw -> retention -> disable/delete by policy.

## Test matrix required before live
For each role run positive access + cross-user + cross-tenant + unauthorised-write tests. Add direct API tests that bypass the UI. Test IDOR attempts against UUID resources. Verify storage policies separately from table RLS. Verify service-role functions authenticate/authorise their caller before privileged writes.

## Workflow invariants
No direct state jumps around approval gates. Every privileged transition records actor, role, prior state, next state, timestamp and reason/metadata. Historical financial/academic decisions are corrected by append/reversal/superseding records rather than silent deletion.
