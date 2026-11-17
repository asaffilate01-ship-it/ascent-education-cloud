# UniPathway — Phase 11: verified academic calendar event projections

**Prepared:** 17 November 2026. **Scope:** source-only calendar integrity and synthetic regression tests.

- Reuse the strict time parser for Pakistan calendar day, day/month labels and saved events.
- Never advertise an invalid, reversed, impossible or timezone-free timed event as upcoming/ongoing, and return an unavailable summary instead of silently changing the date on UK/Pakistan devices.
- Preserve documented legacy ISO date-only all-day events (interpreted as UTC midnight), valid timezone-qualified timed entries and Pakistan-local day transitions.
- Keep event creation and authorisation unchanged; existing centre role guards, RLS, save/delete confirmations and production calendar data remain the source of truth.

**Required gates:** exact-head TypeScript, lint, unit, browser, database/Edge, iOS/Android, design; separate authenticated hosted two-centre RLS/Storage and device/provider acceptance before production publication. Invalid historical event records require an authorised data correction, not an automatic client-side repair. No grades, approvals or enrolments are changed.
