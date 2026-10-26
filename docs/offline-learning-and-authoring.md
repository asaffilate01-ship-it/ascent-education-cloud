# Learning continuity and authoring — 26 October 2026

## Delivered in this change

- The lesson workspace can explicitly save published, currently authorised lesson text and transcripts to IndexedDB. It excludes media and resource URLs, uses a 24-hour reading window, and limits storage to ten modules of at most 5 MB each. The learner sees expiry, size, pending progress and removal controls.
- An already-open signed-in workspace can read its saved pack and record progress without internet. Reconnection fetches lessons through existing RLS before replaying progress. Withdrawn, archived or revised lessons are removed from the local pack and obsolete queued work is discarded with an explanation.
- Progress is stored per account, centre, module, lesson and revision. Acknowledgements identify the individual mutation so a delayed response cannot delete newer local work. Server writes compare the previous update timestamp and retry on a concurrent change. Completion is monotonic within the same revision; a new revision does not inherit it.
- Account switching removes other accounts' packs; sign-out removes all packs and this device's coursework resume hints. Stale profile requests cannot restore an earlier account after sign-out. Auth-event database work is deferred outside the session callback.
- Mobile learners use a compact lesson selector rather than scrolling past the entire sequence. Desktop retains the lesson sidebar. The final lesson links to the module's assignments; all links retain module context.
- Teachers can search accessible published lessons and create independent copies as drafts. Version history is readable and paginated. Loading an earlier version only changes the editor; saving creates another snapshot under the existing optimistic revision check. Neither loading nor copying automatically publishes content.
- Coursework uses the actual TUS client with 6 MB chunks, retry, progress, pause and resume. A saved reservation can be resumed by re-selecting the original file. SHA-256 content fingerprints are scoped to the learner and storage path. Every request checks the destination and current session before adding its token; private files cannot be overwritten. Upload metadata alone does not satisfy the server's existing submission verification.

## Validation

- 24 existing PGlite publishing, RLS, version, progress and withdrawal checks.
- 19 focused React/unit checks including revision restore, copying, optimistic progress conflicts, stale sign-out, upload recovery and submitted-evidence restrictions.
- Real Chromium IndexedDB tests: 14 persistence, account isolation, expiry, mutation acknowledgement, revision and withdrawal checks.
- Real Chromium and the real TUS library upload a synthetic 13 MB file through a test transport that interrupts a chunk. The transfer resumes without a second creation request; progress, credentials, destination filtering and no-overwrite behaviour are checked. This is not a live provider upload.
- Full browser flow at 390 px mobile and 1440 px desktop with synthetic signed-in student/API: no horizontal overflow, responsive lesson navigation, save pack → offline completion → reconnect → server sync.
- Fixed an existing development/preview startup error by moving the FamilySharing lazy initializer below React imports.
- TypeScript and production build.
- Read-only production catalog check: lesson, revision, progress and coursework tables all have RLS enabled and deny anonymous SELECT. No schema or grant changes are required for this release.

## Boundaries and remaining acceptance

This is an explicit text-pack capability, not a fully offline LMS. Cold startup, authentication renewal and signing in still require a connection. Keep the lesson workspace open before going offline. Videos, protected PDFs, external resources, live teaching and assessments are not automatically downloaded. Device storage can be evicted; it is not a backup or encrypted vault. Revocation cannot reach a disconnected device; packs expire locally and are checked again online. Unsynced progress is removed if the learner removes the pack or signs out.

TUS upload URLs normally expire after 24 hours. File bytes are not kept on disk by the application for background uploading; after navigation/reload, the original file must be selected again. A real enrolled student's private-bucket upload and subsequent submission still need production acceptance. The browser checks use a synthetic backend, not real student records.

Copying a published lesson does not provide an institution-wide approved-unit library or a linked template that updates dependent courses. SCORM/LTI, inline assessment annotation, full offline media packs and background file synchronisation remain separate work.
