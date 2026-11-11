# UniPathway Phase 2 — student action accuracy and lecturer daily teaching

## Changes
- The student home agenda now uses the same `courseworkQueueState` decision as the full coursework workspace, including cutoff, attempt limits, resubmission guidance and independently released results.
- Student summaries distinguish actionable work, awaiting human review/IQA, independently released feedback and submissions that cannot currently be made. Deadline labels use Pakistan time, and the overview refreshes at least once per minute.
- The lecturer home provides a daily view of already-authorised, active saved weekly teaching-plan slots using the *Pakistan date*, excluding plans outside their effective dates and invalid times. It never presents a plan as a confirmed Teams meeting, attendance record or learner invitation.
- Teaching home reduces a long module list to four contextual module actions while keeping the full teaching workspace one click away.
- No live provider, RLS, admission, assessment-release or marking rules are modified.

## Acceptance
Run typecheck, lint, units, DB, build, browser acceptance, and native checks on the proposed PR head. Verify a real signed-in Student and Lecturer account in a dedicated isolated staging centre with 360/390/768/1440 px and 200% zoom. Check student expired work / resubmission / fully used attempts / released feedback, permission revocation, delayed queries, PKT midnight rollover, erroneous empty/loading states, scheduled lessons, and real classroom invitation boundaries. Source CI alone does not prove hosted provider activation.
