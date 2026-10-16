# Residential support and teaching allocations

The director residential calendar now includes a visit-specific private-support planner. Anonymous student numbers map to the four groups of up to 50. Staff enter consistent tutor IDs against teaching sessions and one-to-one appointments.

Validation checks real dates, visit boundaries, opening hours, actual partial-cohort size, full-day trip exclusion, 30-minute teaching changeovers, overlapping student/tutor appointments, ten simultaneous support places, and 90 minutes per learner per visit. Two visits provide the agreed annual maximum of three hours. Changing teaching allocations exposes resulting clashes and blocks saving until resolved.

Versioned JSON save/reopen retains appointments and teaching allocations. Import requires matching cohort, visit, dates and student count, and validates all appointments before replacing state. Files are limited to 150 KB and 600 appointments. Use anonymous tutor IDs rather than private information. Switching visit or changing its dates/headcount discards unsaved edits; save the draft first.

These are file-based drafts, not database bookings. Tutor availability, rest, travel duties, overnight accommodation duties, skills and other programme commitments are not inferred. Tutors with different IDs are treated as different people. Existing support plans are not automatically combined across visits or imported from a student roster. No production migration or deployment is included.
