# Tuition progress reports and tutor handoff

A tutor’s report belongs to the learner’s individual plan for an enrolled module, not to the author. Use it for formative observations and the next lesson’s starting point. It does not replace assessment, official grades, or the centre’s safeguarding process.

## A 60-second report after a lesson

1. Record the lesson or skill practised, and what evidence you saw (for example, “Handoff lesson TH-SCH-01: two of three independently”).
2. Name a demonstrated strength.
3. Describe one skill that needs practice. Avoid generic labels or personal judgments.
4. Say what the next tutor should try first, and how to tell whether it worked.
5. Add an educational follow-up category only if useful. Choose the audience before saving. Shared entries can be read by the student and a verified guardian with a separate report opt-in for that plan. Staff-only entries are visible within the assigned teaching and centre oversight roles. Keep diagnoses, safeguarding concerns, contact details, and official unreleased results out of both audiences.

Fictional handoff example: “Learner used the correct percentage base for 2 of 3 items. Still multiplies by 1.25 to undo a 25% discount. Start with a four-block diagram, then ask for an unaided explanation of 4/3.”

## Who can access the reports

- The assigned tutor can see or add reports on an active learner’s plan. Appointment of a different tutor to the module should transfer assignment-derived access on the next server request. It does not change scheduled classes or live invitations.
- A same-centre director has read-only oversight for in-scope active plans, not a global staff view.
- A learner can read their own shared entries. The guardian view needs the existing individually verified learner link and a share for that specific plan and an additional report opt-in. Existing goal and skill sharing does not automatically share report narratives. A shared entry is not exposed to a guardian merely because that account has the parent role.
- Revalidate access when opening a report and after a relationship, role, enrolment or assignment changes. Previously viewed information cannot be recalled. Accounts with ambiguous role memberships should not be assumed eligible.
- The latest 20 entries are displayed. Nothing here is a claim of permanent storage or permission to copy a learner’s records to another platform.

## Before enabling on the main site

Verify actual production prerequisites and current Supabase grants before deploying the reviewed additive database activation. Do not replay historical migrations. Keep the main site on its existing domain and permissions. A frontend build or Git merge does not enable the data service. The feature flag stays off by default. Before enabling family sharing, rehearse the audited single-report withdrawal with the assigned tutor. It hides an accidental disclosure from normal views without deleting or changing the original; a fresh report can correct it. Revoking guardian permission alone does not hide the item from the learner.

Use synthetic test learners and accounts only to verify: the expected student read view; assigned tutor write and rerender; distinct visibility of shared vs staff-only; no matching data for a different learner or centre; same-centre director read-only; verified guardian with separate explicit report permission only; revocation and re-verification until re-shared; an actual change of assigned tutor and blocked access for the previous tutor; ended enrolment; session and selected-learner switches; duplicate retry; mobile and desktop layout. Verify the guardian payload returns only authorised report fields and never the raw learner submissions or internal teaching record. Do not create real notes or disclose real identities while testing.
