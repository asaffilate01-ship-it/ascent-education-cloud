# Individual residential itineraries — 16 October 2026

The director residential planner now combines both annual visits into an anonymous, cohort-local learner itinerary. It derives teaching and staggered full-day trips from the current calendar, and includes only the chosen learner's support appointments and accommodation allocation. It shows annual teaching/support totals and unassigned rooms/tutors explicitly.

Draft CSV export requires both visits, reviewed closures, no outdated operation records, and no support/accommodation conflicts in the selected cohort's visits. User-entered CSV text is escaped and formula prefixes neutralized. Incomplete tutor/room allocations remain exportable as clearly labelled drafts, not booking confirmations. No other learner's room or private appointment is exported.

The UI validates learner numbers against partial cohorts and responds to calendar/allocation changes. Cohort-local numbers are planning identifiers; staff must keep their mapping consistent across visits. There is no student-account mapping, authenticated student publication, email delivery, attendance capture, database persistence or live booking in this feature. Picnic and evening outing remain unallocated and are explicitly identified as such.

Validation: existing 179 tests plus four itinerary tests and one component interaction test passed locally; application TypeScript and production build passed. No live browser or deployed-system test was performed.

Next work: shared tenant-scoped persistence and student identity mapping; picnic/evening activity allocation and transport staffing; adult eligibility/check-in; controlled publication to student dashboards. Each requires explicit workflow/data design and verification beyond the portable draft planner.
