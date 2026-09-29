# CCTV & Physical Security Architecture

## Principle
UniPathway stores camera metadata, authorization, health, event correlations and viewing/export audit. Raw CCTV should normally remain on a secured on-premise NVR/VMS or approved private video platform, not in public object storage or browser-visible permanent stream URLs.

## Network
Cameras -> isolated CCTV VLAN -> PoE switches -> NVR/VMS. No camera is directly internet-exposed. Security workstation/viewing gateway reaches the VMS through controlled network paths. Remote viewing uses authenticated server/VPN/VMS access, not forwarded camera ports.

## Application integration
Camera registry maps each camera to a centre security zone and NVR channel. UniPathway can correlate access events/incidents with camera/time windows. Live or playback requests require an authorised role and a short-lived server-issued viewing session. Every view records viewer, camera, purpose, start/end and playback window. Export requires a reason and separate audit event.

## Roles
Students/lecturers/general staff: no CCTV access.
Reception/security operators: only cameras/zones required for their duties.
Centre director/designated safeguarding/security leads: broader authorised access.
Platform superadmin: configuration/audit only where operationally required; avoid routine viewing.
Permissions should ultimately be represented by dedicated security roles rather than relying only on centre_director.

## Recording
NVR/VMS continuously or event-records according to site policy. Camera health, recording state and retention setting are surfaced in UniPathway. Retention is policy/configuration, not a promise that every camera always has footage. Critical incidents can place relevant footage under evidence/legal hold rather than silently extending all footage.

## Privacy/security
No cameras in toilets/changing/private welfare spaces. Audio defaults off. Display CCTV signage and maintain a documented lawful purpose, access policy, retention schedule and disclosure/export procedure. Encrypt management traffic where supported, rotate device/admin credentials, disable vendor defaults/P2P/cloud features unless explicitly approved, patch firmware, back up NVR configuration and monitor offline/recording failures.

## Emergency muster
An emergency event snapshots expected occupancy from access-control state. Marshals mark people safe/unaccounted at muster points without rewriting historical IN/OUT events.
