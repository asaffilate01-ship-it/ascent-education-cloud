# Microsoft Education & Teams Integration

## Identity
After admission/enrolment approval, UniPathway can provision an institutional Microsoft identity such as STUDENTNUMBER@students.unipathway.edu.pk. The actual Graph provisioning action is enabled only after Microsoft Education tenant verification, domain verification, admin consent and license SKU configuration.

## Live classroom
Use calendar-backed scheduled Teams meetings so recording/transcript artifacts can be retrieved reliably through Microsoft Graph. UniPathway owns the timetable/session record; Teams carries live media.

Class templates:
- tutorial 1-20: interactive audio/video/whiteboard
- seminar/workshop 20-50: interactive + breakouts
- lecture 50-300+: muted/camera-off attendees, moderator, Q&A/polls
- webinar/town hall: large controlled events according to licensed Teams capacity

## Whiteboard
Every lesson can have a persistent UniPathway whiteboard record with optional Microsoft Whiteboard reference. Templates: blank, lined, grid, graph, equations, diagram. Final board is attached to the lesson pack after class.

## Lesson pack
Recording, transcript, whiteboard, slides, attendance, Q&A, polls, AI summary and revision quiz are linked to the LMS lesson. Transcript/recording retrieval requires the relevant Microsoft Graph permissions and tenant admin settings; transcript APIs are subject to Microsoft's applicable metering/licensing.

## Safeguarding
Students and staff use institutional identities. Lecturer views do not expose private student email/phone/address. Academic communications remain LMS/Teams/institutional Outlook. Large classes use moderators.

## Required Microsoft setup
Microsoft Education eligibility; verified domain; Microsoft 365 Education tenant; Entra app registration; admin consent; least-privilege Graph permissions; application access policies where required; student/staff licence SKU mapping; Teams meeting/recording/transcription policies; retention and offboarding policies.
