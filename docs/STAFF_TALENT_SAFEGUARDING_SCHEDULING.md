# Staff Talent Pool, Verification, Safeguarding & Scheduling

## Scale
Maintain a searchable talent pool of 1,000+ prospective lecturers/academic staff. A CV alone never makes a candidate eligible to teach.

## Candidate evidence
Collect: CV, CNIC/NICOP/passport as appropriate, consent for identity verification, academic certificates/transcripts, professional certificates, employment/experience evidence, references, subject expertise, assessor/IQA evidence where relevant, and a short English teaching demonstration video.

NADRA verification uses the same consent-based connector abstraction as student KYC when institutional access permits it. Store minimum verification result/reference; do not store raw biometrics.

## Recruitment workflow
APPLIED -> CV SCREEN -> KYC -> QUALIFICATION VERIFICATION -> EXPERIENCE/REFERENCES -> SUBJECT COMPETENCY REVIEW -> ENGLISH TEACHING VIDEO REVIEW -> SAFEGUARDING -> APPROVED TALENT POOL -> MODULE ELIGIBILITY.

## Module eligibility
Academic management maps verified competencies to controlled module requirements. The system may calculate an eligibility score, but only academically approved candidates enter the scheduling pool.

## Availability
Approved staff maintain recurring availability: weekday, start/end, timezone, online/centre/both, effective dates, maximum weekly hours and preferences. Staff can change future availability subject to timetable lock rules.

## AI scheduling
The Scheduling Agent receives only approved lecturers, competency scores, availability, class slots, workload, clashes and delivery mode. It ranks/suggests lecturer/class assignments. A Programme Lead/Academic Director approves before publication.

Optimisation priorities:
1. subject/module competency
2. verified qualifications/experience
3. availability
4. workload fairness
5. continuity for a cohort
6. no clashes
7. residential/centre availability where required

## Safeguarding communications
Student/staff communication is platform-controlled:
- staff must not use personal WhatsApp, personal telephone numbers, personal email or social-media DMs for student contact
- LMS messaging and institution-controlled domain email are the approved electronic channels
- student personal home address is not exposed to lecturers
- personal telephone/email fields are not exposed in lecturer views unless a separately authorised safeguarding/emergency role requires them
- all LMS messages are attributable and auditable
- institutional email should use managed accounts, retention and security controls
- emergency/welfare escalation goes through authorised centre/welfare contacts, not private lecturer channels

The platform cannot technically prevent a person from independently contacting someone outside the system if they obtain details elsewhere; policy, training, contracts, monitoring of institutional channels and minimising disclosure are therefore required.

## Teaching video
Candidate uploads a short teaching demonstration in English. Human academic reviewer scores clarity, subject accuracy, explanation, structure, learner engagement and English delivery. AI may transcribe and assist analysis but does not make the final recruitment decision.
