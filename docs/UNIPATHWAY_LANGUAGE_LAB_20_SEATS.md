# UniPathway IELTS and language lab: 20 seats plus remote access

## Delivery model

Twenty individual learner stations plus one tutor station. Each learner listens and records independently through a USB headset. The same browser workspace is available to authorised remote learners. Reuse the planned centre laptops if their browser, USB ports and audio checks pass. This architecture can also support German and English language practice; curriculum/content remain language-specific.

Scalable remote enrolment is the goal, not a claim of unlimited simultaneous audio connections or zero usage costs. Independent file playback, asynchronous speaking submissions, webinar audiences and interactive speaking rooms have different capacity requirements. Establish tested concurrency and provider quotas before selling a live capacity promise. Use smaller tutor-led speaking groups; scale additional groups and tutors horizontally.

## Hardware procurement schedule (design recommendation, not a purchase order)

| Item | Quantity | Target |
|---|---:|---|
| Learner computer | 20 | Supported OS/browser, preferably 16 GB RAM and SSD for shared use with Teams/virtual labs; functional USB and Ethernet or adapter |
| Tutor computer | 1 | Same baseline; second monitor useful for roster and lesson controls |
| Wired USB headset with boom microphone | 23 | 20 learners, one tutor, two spares; adjustable headband, wipeable ear cushions, hardware mute/volume |
| Gigabit network switch | 1 × 24 ports | 21 stations plus router/AP leaves one spare; use a larger switch for expansion |
| Cat6 network runs | 21 station drops | Plus router/AP uplinks; label seats 01–20 and tutor; certify cabling |
| Router with failover capability | 1 | Fibre primary, independent backup connection; configure traffic priorities and test failover |
| Access point | 1 initially | Staff/mobile use; final number/placement follows a site survey |
| Display/projector | 1 | Shared instruction only; headphones carry individual audio |
| Backup power | Sized after load survey | Router/switch/AP continuity and safe laptop charging; electrician to size UPS/inverter, protection and outlets |
| Room treatment | Site-specific | Absorbent surfaces, desk spacing/partitions, cable management, ventilation noise control; maintain access and sightlines |
| Headset care/storage | 20 labelled positions + spares | Cleaning process, replaceable pads, damage tracking and accessible seating |

Logitech H390 is a reference USB headset with inline volume/mute and a noise-cancelling boom microphone, not a confirmed Pakistan stock or price recommendation. Trial two units in the actual room with adjacent speakers before purchasing 23; its microphone noise suppression does not soundproof a room. Test headset comfort and input isolation. Prefer wired USB over deploying 20 Bluetooth pairings. No central analogue audio mixer or headphone splitter is required for independent browser stations.

Remote learners need a supported browser, headset/microphone and a stable connection; qualify mobile browsers separately. Start network commissioning with a 100 Mbps symmetric primary fibre target, then validate real simultaneous playback, uploads and live sessions. This is an engineering target, not a guarantee that every video workload fits. Stagger recording uploads and avoid saturating the uplink.

## Software and dashboard scope

| Mode | Learner controls | Tutor controls / remaining work |
|---|---|---|
| Individual practice | Play/pause, seek, volume, speed, repeat a section, mic/device check | Curated recordings and assignments; first local player implemented in this increment |
| Speaking evidence | Existing private recording, preview, consent-based submission | Existing tutor review queue; verify hosted Storage and role access |
| Guided listening | Local volume; tutor may control exercise playback | Build authenticated class roster, readiness checks, start/pause/resume commands and reconnect policy |
| Pair/group speaking | Join assigned conversation, local mute, request help | Build room assignment, join/leave, visible tutor presence and private coaching through a tested media provider |
| Mock listening | Volume and approved accessibility adjustments; restricted replay/seek/speed | Implement server-controlled attempt policy and recovery rules; the individual practice player is not an exam player |
| Centre administration | Seat/device readiness and support requests | Build device inventory, issue queue, room booking, content licensing and recording retention settings |

Teacher monitoring must be visible and session-scoped. No silent background microphone activation. Browser microphone permission and an explicit learner action remain necessary; teachers cannot override hardware mute. Store submitted recordings privately, limit access to authorised tutors, and define retention. Use only owned/licensed recordings; ordinary access to commercial practice audio does not establish redistribution rights. Formal IELTS testing requires separate test-provider arrangements.

## Implemented in this source increment

`IELTSAudioWorkstation` is available inside the existing learner/tutor IELTS Academy. It opens a local audio file up to 100 MB, offers native playback plus independent volume, playback speed, ten-second rewind and A–B repeat controls. It checks a selected microphone with a local ten-second recording and playback, releasing microphone tracks and object URLs on exit. Permission denial, unsupported recording and invalid/unplayable files have explicit errors. No local test audio is uploaded. Existing Speaking studio remains the route for private tutor submissions.

This first increment does not distribute lesson files to remote learners, synchronise stations, implement live pair rooms, or certify unlimited capacity. Use tutor-supplied authorised files locally until the shared content workflow is implemented.

## Acceptance sequence

1. Trial two headsets and two computers: device selection, mute, volume, denied permission, unplug/reconnect, echo and adjacent-seat speech pickup.
2. Commission all 20 learner stations: simultaneous playback, speaking capture, authorised submission, playback and cleanup on sign-out; include one learner at home.
3. Validate tenant/learner/tutor isolation and licensed material access in hosted staging.
4. Implement and test tutor-led sessions with invitations, revocation, disconnect/rejoin, group isolation and visible monitoring.
5. Load-test progressively larger remote cohorts (for example 50, 100 and 250 concurrent users), measure bandwidth/latency, recording/storage costs and provider limits. Publish only the capacity actually accepted.
6. Run a complete classroom lesson, speaking review and mock rehearsal with accessibility checks before launch.

References consulted 24 October 2026:
- Logitech H390: https://www.logitech.com/en-gb/shop/p/h390-usb-headset.981-001576
- IELTS Listening format (recordings heard once): https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening
- Sanako submission and feedback workflow benchmark: https://sanako.com/submissions-and-feedback
