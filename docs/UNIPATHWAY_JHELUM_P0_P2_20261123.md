# UniPathway Jhelum — P0–P2 operating release
Date: 23 November 2026 | Code repository: ascent-education-cloud

## Scope and authority

The Centre Manager / Authorised External Representative is NOT the principal of a school, an automatic statutory company officer, an academic director or a person who may handle students' fees. His private commercial agreement and the named person's details must remain outside this public repository. Allocate a restricted office/external liaison account, NEVER a centre_director, finance_officer, programme_leader or iqa_officer account merely because of a job title. Where a specific SECP filing needs a representative's authentication, obtain a separate valid corporate board authorisation, legal eligibility and portal access.

The centre has three Administration/Admissions posts, with owner-defined full-time/part-time patterns. At least one appropriately trained on-site contact must cover all occupied opening hours and leave; three headcount positions do not automatically cover 91 opening hours. Admissions and Finance remain distinct from the representative and from the academic heads.

Four physical classrooms: MAIN20 (20 people), ROOM10A, ROOM10B, ROOM10C (10 each), maximum total 50 concurrent seats. Normal operating hours 08:00–21:00, seven days, Asia/Karachi. Maximum theoretical 364 room-hours/week; scheduled occupancy is lower after teaching gaps and room changeovers. Online teaching may exceed 50 students but must not exceed tutor/infrastructure capacity.

## P0 — staffing, authority, safe operations, accreditation

- Record three actual Admin/Admissions employee identities, permissions, working days, breaks, leave and owner-approved duty roster. No one receives cash or transfer into personal accounts. Student payment receipts are issued only by the official paid/settled system.
- Appoint Centre Manager / Authorised External Representative by narrow written agreement. External liaison includes approved SECP company-document coordination, police/municipal or Baldia departments, educational boards/authorities, school visits and other local meetings in Jhelum and Punjab. External visit evidence, deadlines and follow-up go to an owner-visible log. Expenses require prior owner approval; no authority to bind the Company or to approve room or teaching schedules.
- Require independently verified credentials, competencies, references, safeguarding checks and academic head approval before tutor scheduling. IQA/assessment must remain separate from teaching as required by the relevant awarding body.
- Keep OTHM/Qualifi qualification-specific centre approvals and hybrid delivery plans as verified external evidence, never as an assumed status. IELTS and ACCA preparation must not be described as official test-centre or Approved Learning Partner status without documented approvals.
- Child safeguarding, guardian links, video recording consent/retention, institutional communications, and minimum-necessary RLS data access are release-critical.

**Existing code foundations:** Staff candidate/verification/competency tables, module_staff_eligibility, staff_availability, safeguarding events, IQA quality workspace and approved staff profiles. The new Jhelum guardrails and staffing checks are in src/lib/jhelumCentreOperations.ts.

**P0 live exit gate:** Negative RLS tests prove the representative cannot verify payments, set discounts, alter tutor rates, approve commissions, change curricula, schedule teaching, release IQA grades or view protected recordings. Three named Admissions/Admin staff are actually provisioned and on a working roster.

## P1 — schedule, learning continuity and student-fee commissions

- Schedule and classroom bookings require academic approval and must reject room, lecturer and student-cohort conflicts at database level. The representative may REQUEST a meeting in the 20-seat room; request is not an approved booking. Existing ScheduleManager and scheduleConflicts are a UI foundation, NOT a complete concurrency guarantee across all room-booking tables.
- Tutors are paid by approved teaching hours. Require confirmed class completion, original agreed hourly rate, independent academic signoff, revision history, attendance evidence and owner/finance payment approval. Never use booked hours alone as payable time.
- Students see only courses they have genuinely paid for or otherwise been expressly granted, subject to access expiry. Parents see only linked minors. New tutors receive a controlled academic handover covering progress, strengths, weaknesses, current concerns, learning plan and upcoming targets.
- Enrolled and authorised users get AWS tech and language labs subject to centre resources, cost quotas, class entitlements and automatic shutdown. Recordings are stored privately with consent and time-based access. A source-level integration is not proof of activated Microsoft/AWS provisioning.
- A canonical student receives EXACTLY ONE original direct-referrer lock. Existing University Referral Income relates to an entirely different product and must not be reused as a local student tuition ledger.
- The private backend stores the actual beneficiary identities and signed commission rates. The public code contains only general settlement/reversal calculations. One reconciled student-fee settlement triggers zero or more unique commission lines. No commission is earned on pending payment or an invoice that has not settled. Refunds are append-only negative adjustments.
- If the centre representative was the direct referrer, only their direct-referral rate applies, NOT their centre share again. If someone else referred the student, the centre representative receives their separately agreed centre-wide share and the direct referrer their own direct rate. Owner-direct students earn only the centre-wide share.
- Test settled, pending, duplicate, partial refund, wrong-centre payment, double attribution, payer account sharing, self-referral, owner-only rate changes, and monthly statements. A referrer's own statement shows no other learner details.

**Code foundations in this branch:** src/lib/centreFeeCommissions.ts and tests; source-only database script scripts/activation/unipathway-jhelum-fee-referrals-forward.sql. No payout API is exposed to the centre representative. No beneficiary or signed agreement is committed.

**P1 live exit gate:** Real canonical payment events have been identified from the true UniPathway backend; a verified settlement produces the correct once-only ledger entry; reversal creates the corresponding negative line; two simultaneous referral claims do not both succeed; owner-approved refunds and payout audit trail are demonstrated.

## P2 — analytics and planning

- Display owner-scoped admissions, conversion, actual fees collected, pending refunds, commission liabilities/approved payouts, teaching delivery, teacher availability, appointment/authority follow-up, staff duty cover, and planned vs actual classroom occupancy.
- Calculate room utilisation from confirmed, valid bookings, not a claim that 364 room-hours have all been delivered.
- Forecast room/tutor conflicts, under-covered administration shifts, module capacity, lab resources and likely tutor fees; proposed timetable changes require human academic approval before publication.
- Provide quality action lists for missing accreditation documents, IQA sampling, consent/recordings, expired tutor credentials, student concern handovers and safeguarding escalations.

**Code foundation:** src/lib/jhelumCentreOperations.ts includes opening hours, room capacities, roster gap checking, approved-teacher criteria, meeting/representative permission checks and planned utilisation helpers. Front-end displays, verified live data feeds, and publication authority still need an environment-specific integration release.

## Critical deployment restrictions

1. Do NOT apply source scripts to DISHBEE. The available connected Supabase project was labelled DISHBEE and is unrelated. Locate and securely connect the *UniPathway* hosted database for SQL/schema verification.
2. Audit existing UniPathway migrations and live schema. Take owner-approved backup and test a new additive forward script in an isolated UniPathway rehearsal database. Historical migration files are not safe to replay on live.
3. Verify real student identity and canonical receipt IDs; settle via provider signature/bank reconciliation. Do not let public browser code write fee settlements or approve payouts.
4. Provision actual staff, authority letters, safeguarding leads, verified subject competencies, room calendars and legal/awarding-body approval evidence.
5. Run unit tests, strict TypeScript, security RLS tests, payment idempotency and actual mobile/desktop browser journeys; check CI. Only then enable guarded UI and production data actions.
6. Owner signs private agreement; Pakistan legal/tax counsel checks commercial status, withholding and SECP delegated authority. The separate private agreement, not this public README, contains rates.

## Current release status

This is a source implementation and a strict activation contract. Code committed to GitHub is not evidence of live UniPathway deployment, an operational AWS or language lab, new authenticated staff accounts, official OTHM/Qualifi approvals, or paid commissions. Mark those items complete only when end-to-end test evidence is available.
