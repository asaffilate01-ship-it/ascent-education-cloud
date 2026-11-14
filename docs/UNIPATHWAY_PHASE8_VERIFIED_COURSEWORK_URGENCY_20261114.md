# UniPathway Phase 8 — clear coursework due times and final cutoffs

## Why this matters
Students can mistake a published **due date** for the distinct **final submission cutoff**. Their dashboard previously displayed both times but sorted every actionable task by original due date. A final cutoff approaching soon could therefore fall below other work or outside the first five cards.

## Source-only improvement
- New deterministic, clock-aware `courseworkDeadlineGuidance`: display one readable description for a final cutoff within two hours, a due date passed while a later cutoff exists, a due date within 24 hours, or a normal planned deadline. A passed cutoff or invalid/out-of-order date receives explicit caution, never an automatic entitlement.
- `prioritiseActionableCoursework` puts invalid dates needing review first, then approaching final cutoffs, passed due dates, 24-hour due dates and planned work. Ties use the relevant instant then stable brief ID; no original records are mutated.
- Student agenda shows the top five most time-sensitive **RLS-authorised published** work items, without changing its full action/review/released/closed counts. Existing source-labelled, accessible, 44px deep links remain.
- The source-grounded study-focus card uses the same deadline order and refuses to recommend a brief with an invalid due date or due time after cutoff.
- Pakistan-local due/cutoff formatting remains explicit; timing recalculates from the existing minute clock. The final coursework workspace still rechecks enrolment, attempt limits, revision, time windows and actual submission permissions.

## Tests
Pure date-boundary and sorting tests and rendered student-agenda tests cover urgent final cutoffs, due tomorrow, overdue work, malformed records, immutable input, priority consistency, no false submission guarantee and no study suggestion on unknown due dates. The existing assessment status and IQA release gates remain unchanged.

## Release boundary
No production database changes, LLM decisions, Microsoft invitation, push notifications, paid model calls, generated lesson material or approval claims. Require full exact-head CI, database and Edge rehearsals, browser acceptance, design checks and Android/iOS builds before merge. Authentic learner acceptance at 360/390/768/1440px, 200% zoom, TalkBack/VoiceOver and time-zone verification remains a separate gate.
