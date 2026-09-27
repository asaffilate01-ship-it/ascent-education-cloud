# Academic Operations Architecture

This layer formalises UniPathway's operating model for Pakistan hybrid delivery.

## Controlled assessment
1. Student submits work.
2. An authorised subject assessor records the assessment decision.
3. The system may select the assessment for IQA.
4. IQA must be a different person from the assessor.
5. Rejected/action-required decisions return to assessment.
6. Results are released only after required moderation is complete.
7. Every change is retained in the audit trail.

## Department ownership
Each programme family has a qualified Department Academic Lead / Lead Assessor:
- Business Management
- IT / Computing
- Accounting & Finance
- Health & Social Care
- Logistics & Supply Chain

Lecturers primarily deliver centrally approved teaching packs, seminars and workshops. Additional subject assessors are added as marking volume grows.

## Curriculum mapping
Every approved module is mapped from awarding-body specification version to learning outcomes, assessment criteria, GLH/TQT, teaching content and assessment evidence. Controlled awarding-body assessments are never silently rewritten by AI.

## UK progression
Progression cases default to UK and track academic readiness, passport/document readiness, English-language evidence, target subject, assigned officer and next action. University referrals separately retain programme, intake, referral code, offer stage and commission reconciliation.

## Centre weeks
Each learner attends two intensive centre blocks per academic year where the approved qualification permits. Centre activity combines workshops/labs/presentations/controlled assessment with progression and employability. For 3,000 learners, capacity is scheduled in rolling cohorts rather than one mass event.

## Progression & Careers Week
Centre-week events support:
- university progression clinics and partner-university appointments;
- employer/internship expo;
- CV/interview support;
- subject workshops and practicals;
- controlled assessment/exams only where permitted by the qualification.

## Identity
Identity review records support CNIC/NICOP/passport and selfie/manual review workflows. Biometric processing must have a documented lawful/privacy basis and restricted retention/access.

## Production gates
Do not launch until tenant RLS policies, negative cross-tenant tests, payment webhook idempotency, backups/restore tests and critical Playwright journeys pass.
