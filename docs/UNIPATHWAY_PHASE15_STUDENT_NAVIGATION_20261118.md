# UniPathway — Phase 15: task-led learner navigation

**Date:** 18 November 2026  
**Scope:** student sidebar and authorised `/workspace` service directory; no auth or backend changes.

## Navigation
- **Today:** current student dashboard, timetable, classroom, coursework.
- **Learn:** enrolled courses, released learning materials, knowledge, IELTS, authorised labs, Microsoft provisioning status.
- **Assessments:** independently released results and result-review routes; coursework remains one tap away from Today.
- **Progress:** attendance, tutor-reviewed plans, career preparation, placements, opportunities and certificate-reference verification.
- **Support:** invoices, student support, wellbeing, reviewed identity documents and residential booking status.

## Invariants
- All 23 pre-existing curated student directory routes are preserved, and `/student` becomes a first-class Today entry.
- The sidebar retains its original role-authorised destinations exactly once, grouped in the same language, with task-first essentials visible by default.
- Search is local to the current role; route-level and database enforcement are unchanged. No new permission, course approval, Teams entitlement or live integration is implied.
- Tests cover route completeness, role isolation, area filtering, mobile-friendly Today entry and unique navigation destinations.

## Release gates
Merge only after the existing production CI and relevant UI tests pass. Confirm true touch, keyboard, 200% zoom and screen-reader behaviour on 360, 390, 768 and 1440px devices before live acceptance.
