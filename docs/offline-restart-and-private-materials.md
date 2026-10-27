# Offline learning restart and private materials

27 October 2026. This supersedes the cold-start and text-only limitations in the 26 October offline phase, within the boundaries below.

## Delivered

- A separate `/offline.html` reader can reopen saved learning after the page closes. The production service worker precaches this reader and its bundled assets, and supplies it when a navigation cannot load. Normal HTML remains network-first; previews and framed editors still do not register the app worker.
- Offline startup never reconstructs dashboard roles or an authenticated API session. It reads an explicit, device-local learning context created only when the user saves a pack or file. The context and every item expire after 24 hours; a clock earlier than the saved timestamp is rejected.
- `/student/downloads` and the student header provide one place for text packs, files, pending progress, deletion, storage usage and sync. Opening this screen or reconnecting makes one authenticated sync attempt across all saved modules; failures have a manual retry.
- Every module is read again through RLS before replay. Revised or withdrawn lessons are removed and incompatible pending changes discarded with a count. Network failures retain pending work. Mutation-specific acknowledgements and existing server optimistic concurrency preserve newer progress.
- Published private module materials have an explicit **Save offline** action. The existing material read and Storage SELECT policies authorise the download; metadata is checked again after transfer. Short-lived signed requests are same-origin-validated, disallow redirects and use no-store. Streamed bytes are bounded even without Content-Length. No signed URL, bearer token or server secret is saved in the offline material record.
- Supported types: PDF, PNG/JPEG, MP4, text and DOCX/PPTX/XLSX. Maximum 25 MB/file, 20 files and 100 MB total. PDF previews stay sandboxed; image/video previews use temporary blob URLs which are revoked on unmount. Office/text files can be exported to compatible device apps.
- Video material playback position survives reopening on the same device without extending access expiry. It is local study state, not an assessment submission or cross-device video-progress record.
- Offline completion survives browser reload. Expired content is hidden; existing pending lesson progress can still sync after online access is rechecked. Clearing packs warns before losing pending work.
- Logout/account switching clears both text and private-file stores. Cross-tab owner changes hide the reader. An already-open session's offline token-refresh event no longer tries to re-fetch a profile and inadvertently erase saved packs.
- The legacy broad image cache is purged. Automatic image caching now covers same-origin site assets only, excluding Storage paths. Private course files use the explicit bounded store.

## Validation

- 37 unit/UI checks across sync, download bounds, lesson progress, module materials, auth cleanup and service-worker preview safety.
- Real Chromium IndexedDB: 14 existing text/queue/isolation/expiry checks plus 13 private-file/context/playback/type/size/logout checks.
- Existing real TUS client: 13 MB coursework upload recovers after a failed chunk without restarting the creation request.
- Built production service worker, real Chromium, synthetic backend: save text and private PDF, close the page, disconnect, open a previously unvisited URL, read content, queue completion, reload, reconnect/sign in and sync; cross-tab account removal; 390px and 1440px no-overflow checks.
- Existing PostgreSQL fixture: 7 protected material publication/storage checks, 15 guardian checks and 33 coursework/IQA checks.
- TypeScript and production build. Live read-only check confirms the material bucket remains private and the module asset read boundary is present. No database migration or expanded grant is needed.

## Boundaries

The site must first load successfully online and install its service worker on the device. A fresh browser with no installation/downloads cannot work offline. Native-webview and iOS-device acceptance remain separate; Chromium tests are not certification for every platform.

Saved data is local browser storage, not an encrypted vault or DRM. Use private devices. Offline revocation cannot be instant; the 24-hour window bounds normal app access. A person controlling a device/browser can inspect its stored data. Exported files remain in device Downloads after sign-out and cannot be recalled. Browser eviction can remove data; it is not a backup.

Only published files in the existing private module-materials bucket are included. Large recordings, external streaming services, Teams/live audio, SCORM/LTI, offline sign-in, background assessed submissions and cloud labs are not implemented by this release. Interrupted private downloads must be retried; resumable coursework uploads are a separate existing feature.

Production real-account download/revocation/reconnect acceptance and verified publication are still required. Provider credentials, Microsoft configuration, email hosting, merchant payments, approved NADRA access and selected CCTV/cloud infrastructure remain separate activation work. This phase does not declare all remaining product gaps complete.
