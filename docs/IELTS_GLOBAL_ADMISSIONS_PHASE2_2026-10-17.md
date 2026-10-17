# UniPathway IELTS and Global Admissions — build handover (17 October 2026)

## Objective
Continue in the existing UniPathway LMS, serving OTHM/Qualifi learners and external students in Pakistan. External applicants can enquire without enrolling in a diploma.

## Built routes
- /ielts-preparation — public IELTS Academic and General Training preparation page with enquiry form.
- /student/ielts — learner study plan, practice submissions, weekly completion and tutor feedback.
- /lecturer/ielts and /director/ielts — guided curriculum and tutor-review queue.
- /pathways — existing UK/Germany comparison plus six-country counselling enquiry form.
- /director/global-partners — prospect and proposed-route registry with Pakistan university outreach.
- /student/progression — verified/published institution pathways and canonical learner applications, not unverified seeded university adverts.

## IELTS programme
- Eight original guided weeks: diagnostic, Listening, Reading, Writing Task 1, Writing Task 2, Speaking, timed revision and final review.
- Academic and General Training have distinct reading and Task 1 exercises.
- Interactive Reading lab includes original passages, six micro-drill questions per test type, a timer, True/False/Not Given questions, explanations, and optional saving into the tutor feedback queue. Mini-drill accuracy is never an official IELTS band.
- Human tutors can provide narrative feedback and, where evidence supports it, a formative Writing estimate. Typed Speaking reflections do not support a numeric Speaking band.
- Live teaching links back to the existing classroom.

## External student and university counselling
- Public form offers IELTS and university enquiries for UK, USA, Canada, Australia, Germany and Pakistan. Select current or external student; no OTHM/Qualifi purchase required.
- Dedicated UniPathway public-enquiry Edge Function validates inputs and explicit privacy acknowledgement, resolves the UniPathway tenant server-side and writes into the existing applications admissions pipeline as an unconverted lead.
- Admissions staff can view enquiry sources labelled ielts_preparation and university_progression.
- Partner prospects start unverified. Pakistan added to destinations; next outreach action, follow-up date and notes can be saved.
- Progression UI no longer assumes that a university is contracted or pays a particular commission. OTHM/Qualifi course acceptance, lead attribution and commission rights all require institution-level approval and evidence.

## Security and legal boundaries
- Migration: supabase/migrations/20261017150000_ielts_academy.sql. Tenant RLS, student ownership, tutor-only grade editing. Run scripts/test-ielts-db.mjs with the partnership database suite.
- Edge Function: supabase/functions/unipathway-public-enquiry/index.ts, configured for public anonymous enquiry. The service-role key stays server-side.
- Existing notify-application staff query is now tenant-scoped, closing cross-tenant notification fan-out.
- No automatic official IELTS booking, no British Council exam status, no guaranteed band or university placement, no implied OTHM/Qualifi institutional accreditation or commission entitlement.
- Logo use by awarding bodies and British Council remains approval-dependent.

## Release gates
1. Confirm the correct Lovable UNIPATHWAY project and its linked database. Do not touch the separate DISHBEE Supabase project.
2. Take a backup, apply migration to staging and test with real anonymous, learner, cross-tenant, tutor and director JWTs.
3. Deploy the new public-enquiry Edge Function to staging and confirm form-to-CRM workflow. Add persistent abuse protection/CAPTCHA before marketing: in-memory IP throttling alone is insufficient.
4. Validate staff/learner browser flows, permission boundaries and the existing migration history.
5. Confirm university progression evidence, signed recruitment agreements, actual commission conditions and correct staff disclosures.
6. Require successful TypeScript, lint, build, unit tests, database tests, Supabase function Deno check, and staged browser checks.
7. Merge to main only when the release checks are met; publish Lovable only after explicit sign-off.

## Known work remaining
- Full licensed Listening recordings and teacher/student audio upload; the Reading lab is an original six-question micro-drill, not a full IELTS simulation.
- Full exams, reliable band conversion using current official guidance, speaking recording and human observation.
- IELTS official registration/provider agreements and test booking.
- Direct institutional API submission and automated commission settlement.
- Lead conversion into enrolled, verified LMS students.
- Live Supabase database inspection had repeated Lovable 504 timeouts; no live migration or student-data write was attempted.

GitHub work branch: feature/progression-ielts-20261017 — PR #31.
