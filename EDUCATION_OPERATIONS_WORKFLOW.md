# Education operations workflow — UniPathway, Ilmvero, Skillfinch and TrainDirekt

Version: 1.2 — 25 October 2026
Status: implementation specification, not deployed functionality.
Owner: Amer Saleem / education operations.
Delivery: extend the existing applications; preserve Lovable-managed databases and publish later. Keep brands separate and connect shared intelligence and communications through Omniqora. iTechEducation is the promotional umbrella, not a newly imposed technical landlord.

## 1. Business decisions and assumptions

- iTechLounge supplies a dedicated outsourced marketing department with approved budgets, accountable staff and reporting for each education brand.
- Station sales agents operate in multiple cities; events include expos, open days, family visits and online information sessions.
- Admissions owns the student/family journey, record completion and handover. Academics owns assessment and learning plans. Finance verifies funds. Only Superadmin activates a provisional student.
- Interpret “if fees paid card is suspended” as “if fees are unpaid”. This is an explicit interpretation, not a rule to suspend paid students.
- Monthly tuition fees fall due on the 1st. An agreed first partial month must have its own amount and due date. Starting mid-month does not silently charge an extra full month.
- Learner, enrolment, finance and access statuses are separate. Suspending one unpaid course must not automatically suspend another fully funded/paid course.
- Proposed safeguard: overdue accounts enter finance review before teaching access is suspended. Any grace period, payment arrangement, waiver or hardship exception is explicit, dated and audited. No automatic penalty or late fee is assumed.
- Preserve access to a limited payment/support portal during a teaching suspension. “Login suspended” means learning/classroom access is suspended; families must still be able to pay, obtain receipts and contact accounts.
- Tuition cancellation received at least 24 hours before class earns one replacement credit. Exactly 24 hours qualifies. No automatic tuition replacement entitlement is assumed for qualification or funded programmes.
- Details below marked proposed are configuration choices; they are not claims about awarding-body or funding rules.

## 2. End-to-end lifecycle and ownership

Marketing lead → assigned city agent/admissions owner → event/visit booking → attended/no-show follow-up → provisional application → document verification → subject assessment → individual learning plan → fee offer and timetable selection → accepted agreement → verified payment/funding clearance → Superadmin approval → account/email/card provisioning → active learning → attendance and progress → monthly billing and renewal → completion/progression/withdrawal.

Every transition records tenant/brand, centre, learner/enrolment, actor, timestamp, previous state, next state and reason. Historical states must not be overwritten.

### Marketing and agents

Campaign records include brand, city, audience, subjects/programmes, channel, owner, approved budget, committed spend, actual spend, dates and outcome targets. Finance approves increases; committed plus actual spend must not be double counted. Attach expenditure evidence and reconcile actuals.

Agents have a verified staff/partner identity, cities/territory, assigned leads, visit calendar and follow-up tasks. Capture referral source, campaign, event and referring agent once; audit changes. Agents see only assigned prospective learners and the minimum fields required for their work. They cannot access NADRA scans, academic evidence or unrestricted finance data.

Events record venue, accessibility, capacity, sessions, staff, budget, registration, family headcount, consent, QR check-in and follow-up. Deduplicate by verified contact plus human review; do not merge different children because they share a parent phone. Track lead → visit → assessment → offer → paid → activated conversion by city, campaign and agent.

No agent commission is invented. If introduced, keep rules, approvals and clawbacks separate from student fees.

### Agent dashboards: student recruitment and school onboarding

Required agent workspaces:
- UniPathway: agents recruit and provisionally onboard students for the relevant tuition, qualification and other approved programme routes.
- Skillfinch: agents recruit and provisionally onboard learners for approved training programmes, including employer/government/external-funded routes.
- TrainDirekt: agents recruit and provisionally onboard learners using the relevant German programme, language, identity and funding configuration.
- Ilmvero: agents recruit and onboard schools as prospective customer organisations. A school lead is not a student application, and an agent referral does not make the agent a school administrator.

Shared agent account and controls:
- Approved agent profile with organisation/person, contact, territory/city, languages, assigned brands/programmes, manager, agreement and active/suspended status. Access to one brand does not grant access to another.
- Dashboard cards for assigned leads, tasks due/overdue, upcoming appointments, applications/onboarding in progress, missing actions, converted referrals and outcomes by period.
- Searchable pipeline, assigned prospect detail, activity history, notes, next action, calendar, reminders, document-request status, visit/demo booking and approved marketing materials.
- Unique referral link/code and event/campaign attribution tied to an approved agent identity. Verify attribution server-side; a supplied referral code is not authority to read or edit a record.
- Deduplicate prospects before creating new applications; route ownership disputes to an authorised manager without revealing another agent's private lead data.
- Separate originating referral agent from current operational owner. Reassignment is audited and does not silently change historical attribution.
- If commissions are enabled later, show only the agent's agreed commission terms and pending/approved/paid/reversed statements. Do not assume a rate or entitlement; finance controls approval and payout, and student fees remain separate.
- Manager view supports assignment/reassignment, territory coverage, workload, funnel performance and inactive-agent handover. Revoking an agent's access preserves the institution's records and ownership history.

Student recruitment dashboard:
1. Create a minimum-data lead with contact permission, learner/guardian contact, location, programme interest, delivery preference, intended intake and referral source.
2. Arrange family/admissions appointments, open days or remote consultations; track attendance and follow-up.
3. Assist with provisional applications and issue secure self-service document requests. Show completion/verification status rather than unrestricted identity scans or sensitive evidence.
4. Track admissions review, assessment appointment/completion, offer issued/accepted, funding pending/approved, finance clearance and Superadmin activation.
5. Display a limited outcome such as awaiting applicant action, awaiting admissions, awaiting funding review, cleared for activation, enrolled, deferred or declined. Finance details are disclosed only where expressly authorised for the agent's task.
6. Handover to admissions/academic/finance owners with open tasks and reasons; track referral conversion through verified enrolment rather than agent-declared success.

Agents cannot verify their own identity/qualification evidence, approve funding, mark fees paid, alter assessed results, approve discounts, issue active cards, activate students or suspend teaching access. Student/guardian document uploads go directly into the restricted admissions workflow. A funded student's pending sponsor payment must not appear as student non-payment.

Ilmvero school recruitment dashboard:
1. Capture school legal/trading name, branch/campus, address/city/country, website, authorised decision-maker, role/contact details and permission to follow up.
2. Record school type, curriculum/boards, year groups, indicative student/staff numbers, current system, requested modules, migration needs and target start date. Do not collect individual pupil records at prospect stage.
3. Use the pipeline: lead → contacted → discovery → demo booked/completed → proposal → agreement → verification → onboarding → trial/pilot if agreed → ready for activation → active; also support deferred/lost with reasons.
4. Track quotation/subscription proposal and approval status, agreement, responsible school administrator, implementation owner, onboarding checklist, training bookings and approved import/migration status.
5. Hand over school organisation verification, tenant creation, administrator invitation, subscription clearance and go-live approval to authorised Ilmvero platform staff. The recruiting agent cannot self-create an active tenant, grant school-admin privileges or bypass activation checks.
6. After handover, show permitted referral/onboarding/renewal outcomes. Do not grant access to the school's pupils, parents, staff HR, grades, attendance or finance merely because the agent recruited it.
7. Treat each campus and parent organisation explicitly; one referral must not accidentally create duplicate schools or merge separate institutions.

Dashboard acceptance tests:
- Each agent can view/update only explicitly assigned permitted prospects within their brand/territory scope; guessable IDs, exports and direct APIs cannot bypass this.
- An agent cannot activate a learner/school, change verified funding/payment status or grant roles.
- Student leads and school-organisation leads have distinct validation and pipeline types.
- Referral links capture attribution without granting access to applications or private documents.
- Duplicate submissions do not create duplicate learners, school tenants or referral rewards.
- Agent suspension/reassignment removes access immediately while retaining audit and referral history.
- School recruitment never grants access to pupil/guardian records.
- Funding-aware student pipeline labels preserve the distinction between sponsor receivables and personal learner debt.
- Any optional commission calculation uses an explicit approved agreement and reconciled qualifying events, with no invented defaults.

## 3. Admissions and provisional family record

For in-centre tuition, book the family visit and assign an admissions officer. Allow secure self-service completion before the visit; staff verify originals or approved evidence at the appointment.

Collect:
- Student legal and preferred names, date of birth, photo, appropriate identity document type/reference, contact details and preferred language.
- Pakistan identity evidence: CNIC/NICOP or child B-form/CRC as applicable; do not demand an adult CNIC from a young child.
- Parent/guardian identities, relationship, guardianship authority, primary contact, payer and consent permissions.
- Current/home addresses, city, emergency contact and next of kin.
- School name, board, class/year, medium of instruction, subjects, prior results, relevant school reports and exam dates.
- Learning/accessibility support, emergency health information strictly where needed, and who may access it.
- Authorised drop-off and collection people, relationship, contact, collection authorisation, expiry/revocation and emergency arrangements.
- Travel method each way, accompanied/unaccompanied permission, transport provider if used, route/pick-up point and expected times.
- Delivery mode, preferred centre, days/times, intended start date, target programmes and learning goals.
- Privacy acknowledgement, guardian consent where relevant, communications preferences, fee terms and collection/travel consent.

Store documents in private storage with limited access, expiring download URLs, access logs and a retention/deletion policy. Never place identity numbers in QR codes, email subjects, notification payloads or marketing exports. Uploaded evidence is not equivalent to verified identity and does not imply access to a NADRA verification API.

Support families with multiple children without exposing one child to an unauthorised guardian. Adult learners control family access. Germany/UK routes use appropriate local identity evidence rather than mandatory NADRA fields.

Provisional records cannot join paid classes, receive active cards or obtain full learning access.

## 4. Assessment and individual learning plan

Assessment is per subject and aligned with class/year, exam board, syllabus and learning objectives. Record baseline scores and qualitative evidence separately.

Each subject plan includes current attainment, strengths, weak topics, prerequisite gaps, language needs, learning barriers, target grade/outcome, exam date, available weeks, suggested frequency, expected practice hours and review dates.

Separate:
- What UniPathway/the provider will deliver: lessons, tutor support, practice, materials, marking and progress reviews.
- What the student will do: attendance, independent practice, assignments and preparation.
- What guardians will support: attendance/travel, suitable study conditions and communication.

AI may summarise evidence and propose plans; an authorised academic reviews and approves recommendations. AI cannot fabricate diagnostic results, guarantee grades, waive qualification entry requirements or approve funding. Track assessment version, assessor, moderation if required and parent/student acknowledgement. Reassess periodically and after material changes.

## 5. Offer, timetable selection and fees

Offer only actual published sessions with capacity. Families choose attendance days from the available in-centre timetable; online learners choose timezone-labelled sessions. Hold a place for a configurable period, then release it if the offer expires.

Fee agreement records programme/subjects, session frequency/duration, delivery mode, start/end dates, monthly amount, first-period amount, billing day, currency, registration/exam/material fees if applicable, discounts/scholarships, payer, instalments, cancellation/refund terms and accepted version.

Finance verifies payments using provider confirmation, matched bank entries or documented authorised manual reconciliation. A payment screenshot, browser success redirect or agent claim never marks an invoice paid.

Monthly tuition:
1. Generate one invoice per enrolment and billing period with a unique key.
2. Deduct approved credits/waivers; allocate payments without double counting.
3. Notify payer/guardian using agreed channels.
4. On the due date, identify unpaid balances; distinguish pending verification, disputed, arranged, sponsored and genuinely overdue accounts.
5. Finance reviews exceptions and records any hold decision.
6. Once clearance is verified, remove the financial hold. If the learner was never activated, keep them provisional until Superadmin approves.

Proposed reminders: 7 days and 3 days before the 1st, on the due date, then configurable overdue follow-up. Do not send contradictory overdue reminders after a verified payment.

## 6. Superadmin activation and identity provisioning

Activation prerequisites:
- Required admission data complete.
- Identity/guardian checks completed where applicable.
- Subject assessment and learning plan approved.
- Offer/terms accepted and timetable place available.
- Programme-specific eligibility and evidence cleared.
- Initial payment verified OR a formally approved sponsor/funding/waiver arrangement.
- Superadmin approval tied to the specific enrolment.

Enforce approval on the server; hiding a button is insufficient. Admissions, agents, teachers and finance cannot activate via direct API calls. Use the existing verified role model in each application; never infer Superadmin from a client-supplied role.

Activation triggers tracked provisioning jobs for student ID, UniPathway.pk email where configured, learner account, linked guardian account, LMS/Teams membership and card. The email domain belongs to the relevant brand; do not give all four brands a UniPathway email automatically.

Provisioning states: queued, processing, partial, completed, failed/retry. Do not say an email/card is issued until its provider confirms creation. Retries must not create duplicate users, email addresses or cards.

Cards use opaque revocable identifiers. Scanning checks current enrolment access on the server, rather than trusting a printed “paid” indicator. Keep administrative identity separate from permission to attend.

Financial suspension disables affected teaching entitlement/card access and LMS/live-class admission. Teachers see “eligible” or “on hold—contact admissions/accounts”, not debt balances or identity evidence. Never leave a child already in the centre unsupervised because of a financial hold; notify responsible staff/guardian and follow collection arrangements.

## 7. Online learner pathway

Replace the family visit with an admissions video appointment, guardian participation for minors where applicable, secure document upload and manual identity/evidence review. Add a device, microphone, connection and accessibility check plus timezone and emergency contact.

Complete subject diagnostics online with clear supervised/unsupervised status; tutor follow-up resolves questionable results. Send the learning plan and fee agreement for acknowledgement. After payment clearance and Superadmin activation, provision the brand account and Teams/LMS membership.

Use authenticated classroom admission, not a permanent publicly shareable lesson link. Validate enrolment/hold status at session access; a previously sent reminder must not bypass a later hold. Record attendance through a combination of provider join/leave data and tutor confirmation; a page load alone is not attendance.

Support low bandwidth, accessible materials and authorised recordings according to consent and course settings. Notify students and linked guardians of timetable changes, non-attendance and progress. Online tuition uses the same 24-hour replacement rule.

## 8. Qualifications and funded programmes

Use the same base journey, with programme-specific checklists for OTHM, Qualifi, ATHE, Pearson, NAVTTC and PSDF. These labels identify intended routes, not verified centre approvals or automatic learner eligibility.

Capture original/acceptable certified certificates, transcripts, awarding institution, qualification title/level, award date, identifier, required references, language evidence, work experience and any prior-learning claim. Track received → checked → verified/rejected/needs clarification, verifier, date and verification method. Verify with the issuing body/institution where an authorised route exists; an uploaded scan alone does not confirm authenticity.

Each checklist is versioned by programme, intake and awarding/funding body and maintained against current official requirements before launch. Store eligibility decisions and reasons; do not implement one universal prerequisite list.

Separate learner admission, awarding-body registration and funding approval. Capture registration references, claim milestones, attendance requirements, assessment evidence, external verification, certificate claims and progression. Do not advertise an award or publicly funded place as confirmed before the relevant approval.

Funding may clear the student’s obligation while the sponsor invoice remains outstanding. Do not automatically suspend a funded student because a sponsor payment is late. Sponsor debt is collected from the sponsor and is not automatically transferred to the learner. Course-specific attendance and make-up rules override the tuition replacement policy.

### Funding allocation, collections and protected learner access

Required across all four platforms following the owner's clarification:
- Record payer type: government scheme, employer, external sponsor/funder, student/guardian or split funding. Link the funder organisation and billing contact to the learner's specific enrolment, course, intake and fee period.
- Capture funding agreement/award/PO reference, approval evidence and verifier, approved amount or percentage, eligible fee components, coverage dates, currency, claim milestones, submission deadlines, payment terms and any learner contribution. Funding applications awaiting approval are not confirmed funding.
- Maintain separate funding approval, claim, invoice, receipt/allocation and learner-access statuses. An approved funding commitment can clear an enrolment for activation before the sponsor pays; it is not recorded as cash received.
- Allocate each fee line to its responsible payer(s). Enforce that allocations reconcile to the net fee without overlapping/double-funded amounts. Split funding may include several sponsors and a student contribution; chase each party only for its own share.
- Sponsor collections dashboard: approved/unclaimed funding, evidence missing, claims ready/submitted/queried/rejected, invoices due/overdue, receipts, outstanding balance, next action, named accounts owner and follow-up date. Send automated reminders/escalations to the responsible funder's billing contact and accounts team, not debt demands to the learner for the sponsor's share.
- Support cohort invoices and bulk remittances with a learner/course/period allocation schedule. Reconcile partial receipts against the specified allocations; keep unidentified money in an exception queue until accounts matches it. Never mark every student paid merely because one bulk transfer arrived.
- Once approved funding is allocated to an activated enrolment, late or unpaid sponsor invoices must NOT automatically suspend the student's login, card, LMS, classes or materials. Access checks use the student's own liability and approved funding coverage, never the combined course balance.
- In split-funded cases, only the learner's genuinely overdue agreed contribution may enter the normal finance review process; sponsor arrears remain excluded. Clearing the learner's contribution must not wait for sponsor settlement.
- Missing/stale funding data or a failed funding lookup must not newly trigger non-payment suspension. Retain the last verified entitlement for an existing active learner and send an urgent finance exception; this does not activate a new unapproved enrolment or override a separate safeguarding/security hold.
- Pending, expired, disputed, reduced or withdrawn funding creates an admissions/finance review, with advance expiry alerts and notification to the learner. Do not automatically transfer sponsor debt to the student or silently revoke existing access. Any revised learner liability requires a recorded agreed arrangement; any resulting change to access requires an authorised, reasoned decision.
- Retain Superadmin-only initial activation. Funding approval is one prerequisite, not permission for finance, an agent or an automated job to activate the student.
- Student/guardian view distinguishes total fees, approved sponsor coverage, student's own amount due and access clearance. Finance sees sponsor debts and collection history; teachers see teaching eligibility only. An optional sponsor portal is limited to its own sponsored allocations and authorised evidence.

Example: for a fee of 100,000, an approved sponsor covers 80,000 and the learner pays their agreed 20,000. The learner's obligation is cleared and teaching access remains active even while accounts chases the sponsor's 80,000.

Acceptance tests:
- Fully funded active learner retains login/card/class access when a sponsor invoice becomes overdue.
- Split-funded learner with own contribution paid retains access despite sponsor arrears.
- Student reminders and personal balances exclude sponsor liabilities.
- Two sponsors plus a student contribution reconcile exactly; overlapping allocation is rejected.
- A bulk/partial sponsor payment is applied only to its matched learner/course/period lines, without duplicate receipt allocation.
- Funding approval does not mark an invoice paid and does not bypass Superadmin activation.
- Funding lookup failure, claim rejection or funding withdrawal produces a review task, not automatic learner suspension or debt transfer.
- A change in one enrolment's funding does not alter unrelated enrolments or expose another learner's records.

## 9. Teacher, assessor and staff onboarding

Candidate → application → identity and qualification checks → references → interview/demo lesson → role-specific suitability checks → signed agreement → pay setup → training/induction → approved active staff member.

Record verified subject competence, year/level, exam boards, languages, qualifications, assessor/IQA scope if relevant, teaching modes, centres, maximum weekly hours, session rate/salary, contract dates, availability and expiry dates for required checks. Use jurisdiction/role-specific checklists; do not impose one country’s checks on another.

Keep identity, payment details, references and HR records restricted. Teachers see their own contracts/pay records and assigned learner information; they cannot approve their own timesheets or change their own authorised competence.

Provision staff email, permissions and LMS membership only after authorised onboarding approval. Expired required clearance prevents new allocations and creates a manager task.

## 10. Availability and AI-assisted scheduling

Teachers maintain recurring availability, leave, date-specific exceptions, preferred centres, online availability and timezone. Student preferences, centre hours, rooms, class capacity and required equipment/labs are scheduling inputs.

Hard constraints:
- Verified subject/year/board competence and required clearance.
- No teacher, student, room or resource overlap.
- Centre/online eligibility, working-hour limits and travel buffers.
- Session capacity, enrolment eligibility, course hours and delivery requirements.
- Approved availability and timezone/DST handling.

AI ranks feasible schedules and explains choices. An authorised scheduler approves publication; no model output directly writes a live schedule or overrides a hard constraint. Store schedule version, proposer, approver and publication time.

Teachers and students receive reminders at 7 days, 3 days and 24 hours. Guardians also receive reminders where authorised. Queue per recipient, session version and reminder offset; retry failures, record delivery and prevent duplicates. For late-created sessions, send a booking confirmation and only future reminders.

If a teacher becomes unavailable, capture the exact date/time and reason, flag affected published lessons, stop obsolete reminders and alert scheduling. Find a qualified substitute or reschedule; notify affected families. A teacher cannot silently delete a lesson or abandon an assigned class by toggling availability.

Changes inside 24 hours trigger immediate operational escalation. A staff/provider cancellation never consumes a student’s personal cancellation allowance.

## 11. Attendance, absence and replacement tuition

Attendance states: expected, present, late, authorised absence, unnotified absence, cancelled by provider and rescheduled. Keep attendance corrections audited and manager-approved where required.

Student/guardian absence notices record session, timestamp, reason, expected return and requested support. Sensitive details stay in restricted notes. Use server receipt time and stored UTC session start to calculate notice accurately.

For tuition:
- Notice at least 24 hours before start: issue one replacement credit linked to the original booking.
- Notice under 24 hours or no-show: no automatic free replacement; authorised staff may grant an exceptional credit with reason.
- Provider cancellation: offer a suitable replacement or apply the agreed refund/credit policy.
- Replacements must match subject/level/duration, have space and use a qualified tutor.
- Redemption is atomic: one credit cannot book multiple replacement sessions.
- The same cancelled booking cannot repeatedly generate credits.
- No extra automatic credit is created by cancelling a replacement; exceptional handling is recorded.
- Proposed configuration: expiry and booking window must be disclosed in the fee agreement rather than hard-coded without agreement.

Repeated absence creates a welfare/academic follow-up, not just a billing message. For minors, unexpected absence or collection issues follow centre safeguarding procedures.

## 12. Accounts, payroll and operational reporting

Provide role-filtered dashboards and scheduled summaries:
- Student fee agreements, billed/paid/outstanding amounts, due dates, credit notes, refunds, discounts, funding and disputes.
- Teacher approved sessions/timesheets, absences, substitute delivery, rates and payables.
- Staff salary/payroll obligations and contract status.
- Expenses, supplier invoices, marketing budgets, event costs and payment approvals.
- Cash/bank/provider reconciliation, receivables/payables ageing, income by service/centre/brand and forecast cash commitments.

Scheduled teaching does not itself approve teacher payment; delivery and exceptions feed an approved timesheet process. Do not label billed revenue as cash received. Record currencies and never total PKR, GBP and EUR without a stated conversion.

Send accounts an automated daily action digest and monthly close pack with links to authorised records, not raw identity attachments. Missing data or failed jobs must show an exception rather than a fabricated zero.

## 13. Permissions and reliability

Roles: Superadmin, centre director, admissions, marketing, city agent, academic lead, scheduler, teacher/assessor, IQA/QA, finance, HR, student, guardian and authorised sponsor/employer.

Enforce brand/tenant and centre scope in backend queries and document access. Cross-brand oversight requires an explicit role; sharing a workflow does not authorise sharing learner records.

Use durable jobs/outbox for reminders, email/card creation, finance digests and Omniqora events. Store idempotency keys, attempt counts, errors, delivery timestamps and retry/dead-letter state. Core admissions and payments must continue if Omniqora is unavailable. Avoid full identity/medical/HR documents in event payloads.

Maintain audit trails, retention schedules, data correction/export processes, access reviews and emergency incident contacts. Implement APIs using existing authentication and server-side authorisation in each repo.

## 14. Implementation order and acceptance evidence

1. Map existing entities and roles in each repo; extend rather than duplicate applications, learners, invoices, classes and attendance.
2. Add provisional family intake, private documents, verification and assessment handover.
3. Add versioned offers, monthly invoice generation, reconciled finance clearance, Superadmin-only activation and scoped access holds.
4. Add teacher onboarding/competence, availability, conflict-safe schedules and durable reminders.
5. Add absence notices, replacement-credit ledger and guardian communications.
6. Add marketing budgets/events/agents, funded-course checklists and accounting summaries.
7. Connect email/card, Teams, payments and Omniqora providers; validate staging and release separately through Lovable.

Required tests before release:
- Non-Superadmin cannot activate through UI or API.
- Missing/failed document or academic checks block activation.
- Payment callback replay and monthly scheduler retry produce no duplicates.
- Unverified payment evidence cannot clear fees.
- A paid course remains accessible when a different enrolment is held.
- An approved funded learner is not treated as an unpaid self-funded learner.
- Holds deny stale live-class links but retain payment/support access.
- Exactly 24 hours qualifies; 23h59m does not; timezone/DST changes do not shift the threshold.
- Concurrent credit redemption yields one replacement booking.
- Unavailability conflicts create a scheduling incident and notify affected people.
- Cross-tenant/cross-family/private-document access is denied.
- Notifications after reschedule/payment are cancelled or recomputed, not duplicated.
- Provider failures remain visible and retryable; no false “email issued” or “message delivered”.
- Test the complete family and online journeys plus a qualification and funded route in each affected app.

## 15. Current delivery boundary

This document records the requested operating model and acceptance criteria. It does not add database tables, forms, role enforcement, scheduled jobs, payment integrations, email accounts or live teaching restrictions by itself. Those features require implementation, testing and controlled deployment in each application.
