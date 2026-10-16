# Admissions referral follow-up

The admissions work queue now filters submitted/acknowledged referrals at 7, 14 and 30 elapsed days after their recorded submission. Missing, invalid and future timestamps appear in the date-unavailable filter rather than being treated as overdue. These are staff triage thresholds, not provider deadlines or time since last contact.

Staff can sort by oldest submission or newest creation. Unknown dates sort last, with case IDs resolving ties. Existing text and stage filters combine with submission-age filters. Referrals are displayed in pages of 20 for both staff and learners; changing filters resets the page. Centre changes reset the added queue controls and urgency updates each minute.

No messages, consent changes or provider submissions happen automatically. Existing action controls and database enforcement remain in place. This change has no migration. Tests cover elapsed-time boundaries, unknown/future dates, eligible stages and deterministic ordering; existing workflow tests cover consent and staff filtering.
