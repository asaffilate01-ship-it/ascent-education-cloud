# UniPathway Phase 7 — verified Continue Learning and reliable lesson resume

## Problem
The student home screen already made authorised queries for published lessons and synced progress. It did not independently verify every returned progress row's student ownership, current lesson revision and assigned-centre/module scope before constructing a resume link. A partial or inconsistent response could therefore produce misleading continuation advice even when the server enforced row-level security.

## Implemented
- New pure source guard `verifyContinueLearningSnapshot` checks published lessons against the current authenticated tenant and verified active enrolled-module list. Invalid status, duplicate IDs, invalid position/revision or cross-centre results fail the entire snapshot.
- The guard validates each saved progress row's exact `student_id`, lesson ID, revision (including allowed historical revisions), completion flag, saved position, timestamp and duplicate composite identity. **Progress from another student, an unlinked lesson or a future revision cannot produce a resume action.**
- Lesson validation runs **before** the separate progress read, so an inconsistent lesson list cannot trigger a secondary fetch. Progress is still queried with the student filter and authenticated RLS client. Unlike the lesson table, progress records do not contain a `tenant_id`; the selected lesson's verified centre supplies that relationship.
- Historical saved progress remains available to explain an `Updated lesson`, but never satisfies current-revision completion.
- The UI describes the source of verified guidance and continues to rely on the protected lesson page to re-check access.
- Invalid or incomplete results yield an explicit error and retry action; another account's resume link is not retained across account/role changes.

## Regression tests
Pure and rendered UI tests cover current and older revisions, another student's progress, cross-centre or non-enrolled lessons, duplicated/malformed records, invalid timestamps, invalid positional data, empty-state behavior, denied secondary reads and account switching.

## Safe release boundary
This PR does not change RLS, issue enrolments, activate AI agents, call a paid model, touch storage, create live migrations, send notifications or claim a production deployment. Require exact PR-head lint, typecheck, unit, Edge/DB, browser, Android/iOS builds and design checks before merge. Authentic two-centre login, Android TalkBack/iOS VoiceOver and real 360/390/768/1440px zoom/offline acceptance still require a separate rollout check.
