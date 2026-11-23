# UniPathway Jhelum — admissions, teaching allocation and communications

## Launch catalogue (planned; approval, tutor coverage and actual fees unverified)
- Grades **9–12** school tuition: Maths, Physics, Chemistry, Biology, English, computing/technology and commerce.
- Pakistan/Punjab boards and Cambridge IGCSE. Other Pakistan boards require explicit syllabus mapping.
- ACCA preparation; IELTS preparation; tech certification preparation.
- OTHM and Qualifi Business and Accountancy **Levels 3–5** first. Do not represent UniPathway as an approved awarding-body centre without signed approval, or imply that preparation is itself an accredited award.
- Future: additional OTHM, Qualifi, ATHE, Pearson and Pakistan/Punjab vocational pathways. These are **interest-list only**, not live admissions.

## Time, location, capacities and tutor allocation
- **Asia/Karachi** timezone; planned daily teaching window **08:00–21:00** (13 hours), not a promise that every programme runs every day.
- An in-person offering is *targeted* at 10 or 20 students, but **actual permitted seats** must be the minimum of target format, verified safe room capacity, staff-to-student ratio, equipment availability and any mandatory local rule. Prior centre floorplan reports one ~15-seat room and three ~10-seat rooms; no 20-seat room is confirmed. Do NOT allocate 20 learners to a 15-seat room.
- Online cohorts can target 50+ only after licensed meeting platform, moderation, assessment integrity, connectivity and tutor load testing. Hybrid must count physical and online students independently against their respective capacity.
- Part-time tutor profiles: qualified subject(s), board/curriculum, highest level approved to teach, evidence of experience, on-site/hybrid/remote eligibility, agreed fixed hourly wage in PKR, availability, leave, active contract, and verification/safeguarding status.
- Roster generation matches subject **AND** board/level, qualification/experience, tutor agreed hours, room capacity and existing commitments. Do not auto-assign a timetable or pay tutor without an approved employment agreement and manual academic review.
- Hourly wages accrue from **approved delivered teaching hours**, not merely scheduled hours. Handle cancellation policies, substitutions, breaks, approvals and payroll withholding separately.
- Maintain staff availability to cover 08:00–21:00 seven days a week; never assume one tutor is available for 13 hours daily.

## Admissions WhatsApp conversation
1. Inbound greeting -> English or Urdu.
2. Student, parent/guardian or other enquirer.
3. Programme; for school tuition: curriculum board, grade 9–12 and subjects.
4. Study preference: Jhelum in-person, hybrid or online.
5. Preferred days/time in Pakistan time.
6. Specific follow-up consent (yes/no), without opt-in to promotional broadcasts.
7. Record enquiry; assign to authorised admissions staff for programme/fees/timetable and availability verification.
8. Human takeover is mandatory for sensitive, uncertain, payment, account or enrolled student requests. The phone number alone is **not** proof of a guardian relationship.

This branch implements a bilingual state machine and server-side conversation-state persistence behind a disabled outbound flag. It **does not** implement a full permissioned admissions dashboard, appointment scheduling or parent-record lookup. The staffed inbox and human-service workflow are launch blockers.

## WhatsApp outbound / enrollment communications (next phases; NOT live)
- Prospect lead progress: inquiry received, callback requested, information verified, offered, enrolled, closed; minimum necessary identifiable fields.
- Student and guardian: absence, academic progress, scheduling changes, upcoming invoice, payment receipt / failed payment. All values must come from authoritative school records, with recipient authorisation, opt-out preferences and immutable send audit.
- **No fee amounts, due dates or payment-completed statements without verified ledger entries.** Message templates require Meta approval; initiate outside the 24-hour window only via eligible approved templates and valid opt-in.
- Maintain separate opt-in ledgers for admission follow-up and optional marketing; support STOP, expiry, erasure, and change of legal guardian.
- Never attach student performance, health or safeguarding case details automatically; use secure dashboard deep links after authentication.
- Safety: English/Urdu quality assurance, no prompting AI with private data absent explicit authorisation, no unauthorised bulk blasts, staff handoff and acknowledgement, delivery/billing/status reconciliation.

## Proposed dashboard ownership
- Admissions (3 staff): lead inbox, language, programme interest, response SLA, follow-up tasks and authorisation of offers.
- Academic heads: approve course/board/level coverage and match tutors.
- Scheduler: room/time/tutor conflict checks; teacher availability.
- Tutor: agreed hourly rate, allocations, attendance and approved delivered teaching hours; no independent change to fees.
- Students and guardians: verified account notifications, lesson notes, attendance and dues with authorised access.
- Management: aggregate admissions funnel, staffing coverage, billed receipts and audit, but no unnecessary disclosure.
- Centre representative can support approved external outreach; no unilateral timetable, fee or academic control.

## Launch-gate checklist
- Verify live project and back up, rehearse additive SQL, review RLS; do not use another project's connected Supabase.
- Add auth-enforced shared conversations UI, ownership/handoff, and fail-safe event delivery before sending messages.
- Obtain Meta account, approved phone number, app signature token and approved templates; test real inbound, retry, privacy and language.
- Verify enrolment, guardian links, finance ledger, payroll and curriculum availability before wiring automated messages.
- Run mobile/desktop and Urdu RTL accessibility reviews, UAT with a small pilot cohort, security audit and monitoring.
