# UniPathway — Phase 9: deterministic academic dates and deadline confidence

**Scope:** Source-only hardening of student-facing assessment and class schedule projections, prepared 16 November 2026.

## Problem
JavaScript's loose `Date.parse` accepts timezone-free timestamps, natural-language dates, some impossible calendar days and other strings whose interpretation differs by browser and user locale. A student in the UK and an instructor in Pakistan must not receive different client-side interpretations of the *same* deadline.

## Implemented
- One shared `parseAcademicInstant` accepts **ISO date-only** records as UTC midnight for backwards compatibility, or ISO timestamps carrying an explicit `Z` / `+HH:MM` / `-HH:MM` offset.
- Reject invalid calendar dates, time components, extreme offsets, alternate date formats and timestamps without an offset. Accept valid UTC offset or fractional-second timestamps.
- Use this parser consistently for student coursework-window guidance, actionable task classification, priority sorting, next-step recommendation, Pakistan-local displayed assessment time, and enrolled-module class verification/sorting. An invalid class row blocks the complete class snapshot rather than producing unverified invitation advice.
- Add synthetic pure-function tests for UK/Pakistan-equivalent instants, leap days, rollover dates, ambiguous local times, closed submission windows, class listings and response evidence.

## Boundaries
- **No change** to the Postgres schema, RLS, server-side submission or classroom authorisation, provider credentials, authenticated sessions, LMS enrolments, student data, and no automatic awarding or grading.
- Real data writers must emit timezone-qualified `timestamptz` values. Legacy date-only records remain supported as UTC midnight for existing demonstrations/test fixtures but should be migrated to explicit instants in production.
- If the data is ambiguous the UI shows an unavailable date, directs the learner to verify the record and does not imply that they can submit.
- The authenticated backend controls the real deadline, attempts, marking and Teams invitation.
- Release gates: exact-head TypeScript, lint, unit, DB/Edge, browser acceptance, Android/iOS builds and design; review on devices configured for UK and Pakistan time zones plus DST transitions before production promotion.

## Next phases
- Audit and normalise all import pipelines and admin forms writing coursework/class datetimes.
- Verify centre-configured time zone policy with academic staff (the currently deployed Pakistan-time labels are intentional and remain unchanged).
- Follow through on two-centre authenticated RLS/Storage and real Microsoft administrator/device acceptance before claiming production-ready learning, AI or Teams integrations.
