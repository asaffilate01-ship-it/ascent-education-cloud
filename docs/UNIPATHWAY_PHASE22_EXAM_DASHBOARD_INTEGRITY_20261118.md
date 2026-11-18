# UniPathway Phase 22 — Exams Officer dashboard dates and snapshot integrity

**Source-only UI improvement | 18 November 2026**

## Findings
The Exams Officer dashboard used browser-local `new Date().toLocaleString()` for a Pakistan centre's exam start date, despite the academic calendar explicitly using `Asia/Karachi`. Its preparation warning logic used permissive `Date.parse`, which accepts ambiguous timezone-free timestamps and can normalise impossible calendar dates. A query filtered by centre still silently discarded unexpected foreign rows, potentially showing a reassuring empty state after an inconsistent response. Pagination could also show no cards after a source list shrank.

## Changes
- Use the shared Pakistan academic calendar's date summary and explicit Pakistan-time label; show **Date unavailable** when exam bounds are missing or ambiguous rather than inventing start/finish confidence.
- Validate zoned timestamps for timed exam events and allow legacy date-only only for all-day records; retain malformed exam records with a review warning rather than treating them as confirmed.
- Verify the complete centre-scoped exam snapshot, exam type, record shape and unique IDs before calculating status or showing calendar data. An inconsistent source shows **unavailable + Retry**, never “no exams.”
- Restore a valid page when the returned list has shrunk; make section navigation usable by keyboard and on 360px screens using touch-sized controls.
- Add Vitest unit and React UI regressions covering malformed dates, centre isolation, pagination, active-role changes and navigation.

## Boundaries
Read-only advisory calendar, not official board registration or classroom invitation. Exam candidates, invigilators, room capacity, approvals and published exam results remain separate controlled workflows. Does not change RLS, actual exam submissions, schedules, external providers, SQL or production data. Real officer-session, two-centre and physical Android/iOS acceptance remain required before production signoff.
