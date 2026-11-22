# Dashboard & learning-features audit — 22 Nov 2026

Method: signed in as all 17 development accounts, opened every dashboard menu link (357 page visits, desktop 1280px) plus each landing page at 411px phone width; live database checked read-only; source reviewed for live/recorded lessons, language lab and tech labs.

## Results
- All 17 roles sign in and land on the correct dashboard. No crashes, broken menu links or sideways scrolling on phones.
- 41 distinct pages load but show "unavailable"/empty sections because their database tables or functions were never applied to the live database (forward migrations outstanding).
- Private messages show "awaiting secure activation" for every role.
- Live content is empty: 0 live classes, 0 published lessons, 0 lesson plans, 0 weekly timetable entries, 0 Microsoft accounts, 0 tuition learning plans.

## Feature status
| Area | Status |
|---|---|
| Lesson builder / student lesson workspace / progress / offline text packs | Database live; no lessons authored yet |
| Lesson plans, weekly timetable, tuition learning plans | Database live; empty |
| Teams live classes (schedule, invite, join) | Database live; needs Microsoft connection + calendar worker hosting |
| Whiteboards, hand-raise/Q&A, teaching desk | Built; tables missing in live database |
| Attendance history | Working; daily register + corrections functions missing |
| Recordings (Teams retrieval, review, private playback, release) | Built; tables, private bucket, Microsoft permissions and worker missing |
| Module materials uploads | Table live; release switch off, rights table missing |
| IELTS academy (plans, listening, speaking, mocks) | Built; all IELTS tables missing — students see a load error |
| Individual audio workstation | Works in browser, but hidden behind the IELTS load error |
| Tutor-led guided audio (20-seat lab) | Built; functions + private audio bucket missing; no hardware acceptance |
| Managed AWS labs | Built; gateway not deployed (404), AWS account/fleet/keys not configured, lab tables missing |
| Practical lab hub / instructor planner | Built; tables missing |
| Browser Code Lab (HTML/JS/Python) | Working, no setup needed |
| Placements, CCTV, Opportunity Fund, accreditation, knowledge library, international progression, syllabuses | Built; tables missing |

## UX observations
- Phone header uses two rows (~115px) before content.
- Lecturer and director menus are very long (25–60 items); several labels truncate.
- Student/lecturer pages show technical wording ("migration status", "AWS streaming links expire after 60 seconds", "connector unavailable").
- Many pages carry dense compliance copy that pushes the main action down.
