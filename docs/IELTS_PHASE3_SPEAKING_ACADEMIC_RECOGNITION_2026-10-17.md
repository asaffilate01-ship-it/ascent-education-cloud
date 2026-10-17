# UniPathway IELTS Phase 3 & Academic Recognition — 17 October 2026

## Scope and status
Continue existing UniPathway LMS and international admissions. Source code is in GitHub PR #31 on branch feature/progression-ielts-20261017. It is **not production-deployed**. Lovable is connected to main; these migrations and new private bucket have not been applied to the Lovable-linked database. Do not apply them to the unrelated DISHBEE Supabase project.

## Built — IELTS
1. **Original Listening mini-lab** (src/lib/ieltsListeningDrills.ts and src/components/ielts/IELTSListeningLab.tsx): two original dialogues with 6 questions each, computer/device speech, corrections, explanations and a tutor-visible practice summary. IELTS Academic and General share the Listening paper; no claim that synthesized browser voices reproduce official exam recordings, speaker accents or official timings. No unauthorized exam media embedded.
2. **Original Reading mini-lab**: existing Academic and General readings with review explanations and opt-in LMS saving.
3. **Private Speaking studio**: microphone permission on student action, short original Part 1–3 practice prompts, local playback, explicit user consent before upload, private storage under tenant/student/random UUID. Recording is limited to 150 seconds and 10 MB, with WebM/MP4/OGG accepted. User can delete own recording. Private signed playback URLs expire; no public audio links.
4. **Tutor Speaking assessment**: audio must be played before the UI enables written feedback. Four independent criteria (fluency/coherence, lexical resource, grammar, pronunciation) can be entered in half steps or left unscored; full rubric only. Human formative estimates are NOT official Speaking band results. A tutor cannot edit original student evidence.
5. **Exam preparation evidence dashboard**: eight evidence milestones, notes pending vs tutor reviewed, private Speaking review status. Percentage measures recorded preparation activity, NOT the probability of passing, an official IELTS score, readiness certification or visa/admission entitlement.

### Speaking data permissions
- SQL migration: supabase/migrations/20261017192500_ielts_speaking_evidence.sql
- Bucket: ielts-speaking, private, max 10 MB, only audio/webm, audio/mp4, audio/ogg.
- Storage RLS restricts object paths to authenticated student owner and same-tenant reviewers; immutable uploaded bytes (no overwrite).
- Database RLS: students read/insert/delete own recordings only; tutors read/assess within tenant only. Identity triggers reject non-students or cross-tenant paths. Audit fields capture human tutor review.
- Database security tests: scripts/test-ielts-speaking-db.mjs, required in npm run test:db.

## Built — OTHM/Qualifi academic recognition separate from paid agents
1. SQL migration: supabase/migrations/20261017194000_academic_progression_sources.sql.
2. Academic evidence fields: awarding body (OTHM/Qualifi/Other), qualification title and level, country, institution, receiving programme, grades/credits, language requirements, entry stage, official university/awarding-body URL, review date and recheck deadline.
3. Staff can propose records but proposals are **not published**. Only centre directors/superadmins can verify official source evidence. Edits to a verified route’s relevant requirements, source or recheck deadline automatically change it to under review and hide it. Expired sources are denied student visibility by dynamic RLS.
4. Student progression now separates an **academic-source directory** from **contract-backed recruitment routes**. A verified academic source never implies direct university recruitment appointment or referral commission.
5. Audit table records evidence changes, reviewer and status; cross-tenant/staff/student restrictions have separate database tests scripts/test-academic-progression-db.mjs.

**No partner agreements, university programme acceptance, referral amounts or official IELTS partnerships are created by these source changes.** The directory has no invented verified seeded entries. The receiving institution ultimately decides admission and recognition.

## CI
Production CI requires TypeScript, lint, Deno Edge Function checks, existing DB, IELTS speaking DB and academic evidence DB tests, Vitest, and build. Existing PR check results must be verified against the **latest** head after each change.

## Remaining rollout gates
1. Verify the Lovable UNIPATHWAY project’s actual database reference (the Supabase connector linked to this chat only exposed unrelated DISHBEE). Lovable SQL inspection previously returned 504; do not guess a project ID.
2. Secure a production backup; replay all migrations on a staging branch/project with the authentic schema and Storage service.
3. Browser-test student microphone permissions on current Chrome/Edge/Safari mobile/desktop, actual audio upload/retrieval/deletion, storage policies under two tenants, same-centre tutor feedback, and 10 MB/150 s limits. Unit/PGlite tests are not sufficient as a production Storage service acceptance test.
4. Review retention policy, consent notices, child/age restrictions, incident logging, accessible non-recording alternative, and data subject erasure. Audio is personal data.
5. Confirm official university progression sources and OTHM/Qualifi qualification-to-programme eligibility with university staff. Academic-source verification is not a recruitment/commission contract.
6. Deploy UniPathway public admissions Edge Function to staging and verify enquiry → CRM, CAPTCHA or persistent anti-abuse, and invitation-based lead conversion to a student account. No production invocation assumed.
7. Add fully authored/licensed Listening audio (prefer teacher-owned recordings), full-length authentic-format practice papers, human-assessed writing and speaking, and institute-specific entry/band rules. Current mini-labs are not 40-question official IELTS mocks.
8. Do not publish from Lovable without explicit go-live approval. Do not merge feature code to main until staging security and browser checks are complete.

## Running locally in a checked-out repository
- npm ci --ignore-scripts
- npx tsc --noEmit -p tsconfig.app.json
- npm run lint
- npm run test:db
- npm run test
- npm run build
- npm run check:intelligence
- npm run check:enquiry

**Status descriptions must remain precise:** committed and CI tested is not deployed, nor does it guarantee regulatory approval or live availability.
