# Dated adult residential planner

The director-only residential planner now includes a dated calendar. It schedules two 14-day visits per cohort, each cohort up to 200 students and each teaching group up to 50. It uses the existing 36-hour fortnight teaching rotation and teaching-free full-day Lahore/Islamabad trip suggestions. The final partial cohort uses actual group headcounts, including one-person remainder groups.

Inputs: student count, season start/end, clear turnaround days between centre bookings, minimum clear days between a cohort's first and second visit, and named inclusive closure ranges. Defaults assume October 15 2027 through April 15 2028; no religious calendar dates are invented. Ramadan, Muharram and other closures require staff entry and review. Changes and imported plans reset the review flag. Closure overlaps count once. Dates use date-only arithmetic, so browser timezone and DST cannot move a visit.

Scheduling is first-fit, all first visits before second visits. It never shortens a visit to fit. Missing visits are listed; failure is not a proof that alternative ordering cannot work. Turnaround can coincide with a closure because it is a non-teaching gap. The minimum inter-visit gap counts calendar days, including closures.

Users can save a versioned JSON draft file and reopen it. Imports validate schema, real dates, range order, numeric limits, closure count and file size before replacing current state. This is portable file persistence, not database persistence. Dated teaching/trip CSV export requires a complete plan and explicit closure review. Files contain planning inputs and group counts, not individual student records.

The UI previews visits, selected-visit teaching, group trip dates and optional support tutor-hours. Private-support appointments, the annual picnic/evening outing, transport, room and staff allocations remain to be built. No bookings are created, no learner schedules published, no awarding-body approval asserted and no production database altered.

Validation: 165 application tests pass, including inclusive/overlapping closures, minimum gaps, insufficient seasons, leap days, malformed files, partial cohorts, teaching-free trips and closure-review export gating. TypeScript passes. Production build and lint are release checks.
