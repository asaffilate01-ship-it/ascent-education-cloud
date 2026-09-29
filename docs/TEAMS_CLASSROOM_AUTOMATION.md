# Teams Classroom Automation

## Timetable -> Teams
Approved timetable session creates a live_class_session. Once Microsoft tenant credentials are configured, a server-side Graph connector creates a calendar-backed Teams meeting for the institutional lecturer account and stores meeting/event/join references. Students see only the LMS Join Live action.

## Large lectures
For lecture/webinar modes, attendee mic/camera default off. Assign at least one moderator for large classes. Moderator handles Q&A, raised hands, technical issues and attendance exceptions while lecturer teaches.

## Artifact ingestion
After class, background sync collects permitted attendance, recording, transcript and other provider references into live_class_artifacts. Whiteboard/slides can also be linked as lesson artifacts. Access/retention follow institutional policy.

## AI lesson pack
Only retrieved source material from that lesson (transcript, approved slides and whiteboard content where extractable) can ground the pack. Draft summary/key concepts/glossary/revision questions/quiz require human academic review before student publication.

## Identity
Provisioning remains gated on Microsoft Education tenant verification, verified institutional domain, Entra app/admin consent and configured licence SKUs. Students use institutional Outlook/Teams identities; private contact details remain hidden from teaching staff.

## Production credentials still required
MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET or certificate-based production credential, approved Graph permissions/access policy, Education licence SKU IDs, domain, Teams meeting/recording/transcription policies.
