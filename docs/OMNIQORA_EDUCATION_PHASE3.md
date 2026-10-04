# Omniqora Education Phase 3

Phase 3 adds a transactional-style event outbox and Cohort 360. Domain workflows write their own records first; server/database hooks queue a minimal event for later processing. This avoids making core academic workflows depend synchronously on an external Omniqora service.

Initial triggers cover completed virtual labs and completed residential work placements. Further triggers/functions should be added only after confirming each source table's authoritative state transition: attendance, assignment submission, final assessment, resubmission, tuition/STEMCoach and careers/progression.

The outbox is intentionally separate from the intelligence event table. A future central Omniqora worker can export pending events idempotently, mark them exported and retry failures without duplicating source events.

Cohort 360 initially aggregates transparent Student 360 signals. It is not a causal or predictive model. Course/cohort membership filtering must be tightened to authoritative enrolment/cohort tables before production scoring is relied upon.
