# UniPathway International Admissions & IELTS — Phase 4 handover (17 October 2026)

## Source status
Working branch: `feature/progression-ielts-20261017`, PR #31 in `asaffilate01-ship-it/ascent-education-cloud`. **Do not confuse a passing CI run with production deployment.** The Lovable UNIPATHWAY project's main branch and its Supabase data have not been updated by this phase; the Supabase connector in chat only shows an unrelated DISHBEE project.

## Developed in this phase

### External and internal student activation
- New `international_service_enrolments`: an existing public counselling lead is matched by centre admissions staff to an independently registered **email-verified** student account in the same tenant using a protected RPC.
- Service type distinguishes `ielts_preparation` from `university_counselling`.
- Complimentary is the default. Staff may explicitly choose an included service only when the learner has an active UniPathway academic-course enrolment. No tuition charge, paid add-on purchase or diploma enrolment is automatically generated.
- Service activation is idempotent, forbids another user's account from taking over a matched lead, and tracks staff assignment.
- LMS/Admissions CRM UI surfaces unmatched requests and activation statuses.

### IELTS rehearsal operations
- Student/tutor-facing supervised rehearsal management, with a separate Exams Officer route.
- Scheduled short-practice or full supervised rehearsal; mode Academic or General Training; online or centre.
- Full rehearsal completion requires evidence of real 40-question Listening and Reading attempts plus teacher observations of Writing and Speaking.
- Results are *raw practice counts* and human recommendations, never an official IELTS score or official test booking.
- Student can read only own rehearsal; authorised teaching/exams staff manage it; immutable evidence/guarded transitions.

### Staff and third-party partnership readiness
- Internal UK/US/Canada/Australia/Germany/Pakistan partner application tracker for university recruitment, academic articulation, IELTS registration partners and independent official test venue applications.
- Staff certification tracker and renewals for British Council counsellor knowledge, IELTS-related orientation, CELTA and other English/international admissions credentials.
- Recorded evidence is internal and reviewed by the director; it does not create or imply official approval. The student-facing course and marketing materials must not use unlicensed partner logos.
- Distinguish partner registration from full authorised IELTS venue approval.

### Contract-linked university commission
- New `university_commission_claims` and append-only event log. Requires an enrolled, consented referral, evidence of an active-at-enrolment signed partner agreement and documented commission terms.
- Server computes flat or tuition-percentage commission from agreement. Cannot invent a flat fee, commission percentage, FX conversion, unverified tuition figure or silent tiered payment.
- Lifecycle: draft → verified → invoiced → received; cancellation and reversal/clawback documented by references.
- Received status is a manual evidence attestation, **not** a bank API confirmation. Reconciliations require actual payment statements.
- Finance UI keeps verified claims separate from older, manually entered unverified referral records and separates currency totals.

## Code and migrations
- `20261017201000_international_service_activation.sql`
- `20261017202500_ielts_mock_rehearsals.sql`
- `20261017204000_staff_and_partner_readiness.sql`
- `20261017205000_verified_university_commission_claims.sql`
- Protected React components for service activation, mock rehearse management, international partner applications, staff credentials and verified commission claims.
- New PGlite regression tests for activation, rehearsal, staff training and contract-based university income.

## Must-complete release gates
1. Obtain trusted confirmation of the UniPathway Lovable database project and a pre-migration backup; **do not deploy these migrations into DISHBEE**.
2. Replay all migrations in timestamp order to staging; verify complete JWT role and RLS cases across at least two tenants, including Storage permissions for opt-in speaking audio.
3. Validate real public enquiry submission → admissions → verified student login → activation → course access. Configure durable anti-spam protection and privacy notices.
4. Test actual mock scheduling, private audio capture, tutor feedback and all university claims lifecycle stages with browser workflows.
5. Verify staff certificates and each third-party approval from the authoritative issuer, with expiry/renewal and appropriate consent.
6. Audit safeguarding and data retention; any microphones and speech transcripts are personal information. No unauthorised automated speaking scoring or full-exam claims.
7. Before revenue recognition, reconcile verified contracts, referrals, student enrolment, invoice, bank receipt, clawback and jurisdiction-specific agency disclosure.
8. Merge and publish only after current CI is green, the branch is reconciled with latest main and launch approval is given. Lovable has not been published with these changes.

## Still unconnected / further development
- Licensed, authentic full IELTS test paper content and reliable score conversions. Current Reading and Listening drills are original short examples, and supervised full rehearsals require separately prepared practice papers.
- Full official IELTS registration-provider API and exam-centre approval, until provider credentials/contracts are supplied.
- Direct official university application APIs; current pipeline is controlled manual case management.
- Student payments for optional IELTS preparation as an add-on (quoted status not activated automatically).
- Real payment processing, accounting ledger export and direct bank settlement for university recruitment; the new finance ledger is evidence-based, manually reviewed tracking only.
- Omniqora Intelligence: aggregate only tenant-authorised, minimised counts; no private student written answers, identifiable admissions dossiers or audio may be indexed without an approved policy and consent.

## Verification
GitHub CI must pass TypeScript, lint, Deno Edge Function checks, Vitest, production build and all PGlite RLS suites on the **latest** PR commit. Do not claim launch-ready solely from test fixtures.
