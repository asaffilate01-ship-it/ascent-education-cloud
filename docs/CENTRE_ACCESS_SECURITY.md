# Centre Access, Attendance & Physical Security

## Objectives
1. Secure the building and controlled zones.
2. Record staff entry/exit for attendance/timekeeping.
3. Maintain a live in/out occupancy register for evacuation and emergency response.
4. Control and audit visitors/contractors.
5. Issue controlled temporary passes to students attending residential/centre weeks.
6. Link incidents to access events and CCTV references without exposing surveillance footage broadly in the SaaS.

## Staff
Every staff member receives a unique access card. Entry and exit readers/gates create immutable access events. HR/timekeeping may derive attendance from events, but exceptions (forgotten card, off-site work, authorised leave) require an auditable correction workflow rather than altering raw gate events.

## Students
At first arrival for the residential/centre period:
- locate student by student number
- verify identity against the verified KYC record and original CNIC/NICOP as configured
- record arrival
- issue a numbered student gate pass valid only for the authorised centre/residential period
- log each entry/exit
- deactivate/return the pass at departure

Do not create a new identity record from the gate desk if a verified KYC record already exists; verify against it.

## Visitors
Visitor presents acceptable ID to security/reception. Record minimum necessary identity reference (masked where possible), host, purpose, check-in time and ID checker. Issue numbered temporary visitor pass. Pass is used for controlled entry/exit, surrendered on departure and marked returned. Visitors should be escorted or zone-limited according to policy.

## Emergency muster
The live occupancy screen derives the latest valid IN/OUT event for each credential. Emergency mode freezes a muster snapshot and provides staff/student/visitor counts plus named/numbered reconciliation. Manual muster status should be recorded separately from raw access events.

## Physical design
- security presence at external/perimeter entrance and reception/access gate
- controlled pedestrian gate/turnstile or equivalent anti-passback capable reader
- separate controlled staff/operations zones where appropriate
- reception visitor management station and pass inventory
- CCTV at entrances/exits, reception, circulation areas and external/perimeter risk points
- avoid cameras in toilets, changing/private areas and other inappropriate spaces
- UPS/backup for access controller, gate, network and critical CCTV
- emergency egress must never depend on ordinary access authorisation; life-safety/fire requirements take priority

## Privacy and retention
Access logs, ID checks and CCTV are security/personal data. Apply purpose limitation, role-based access, documented retention, incident/legal holds and access logging. Store CCTV references in incident records; footage remains in the CCTV/VMS system unless an authorised evidential export is required.

## Integrations
The SaaS should expose a vendor-neutral Access Control Connector interface. Supported hardware may use card/NFC/QR/biometric readers where lawful, but the platform must not be coupled to one manufacturer. Device events are signed/authenticated, mapped to tenant/access point/credential and ingested server-side.

## Dashboard
Security/Reception:
- currently inside
- entries/exits today
- denied attempts
- visitors currently in
- passes not returned
- arriving residential students
- security incidents
- emergency muster button

Director:
- occupancy trend
- staff attendance/timekeeping exceptions
- access exceptions
- visitor volumes
- incidents
- device health

Student/staff:
- own active credential and own access history only.
