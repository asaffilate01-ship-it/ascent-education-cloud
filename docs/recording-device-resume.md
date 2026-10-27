# Recording resume on this device

Released class recordings resume after closing the player or reloading the page. Positions are saved at most once every five seconds during playback, and on pause, player close or page hide. Start again resets the bookmark; reaching the end also resets it. A visible status distinguishes a successful save from unavailable browser storage.

Only the artifact ID, numeric position, timestamp and account/centre scope are stored. Signed URLs, storage paths, titles and media bytes are never included. Entries expire 24 hours after their last save; at most 100 are retained. Expired entries are ignored and pruned on the next save. Sign-out and identity/centre changes clear the store, including environments without IndexedDB. Stale account writes are rejected using the existing active learning-account guard.

Resuming never bypasses archive RLS or fresh private-media authorization. This is a device convenience, not protected offline recording playback or cross-device progress. Clearing site storage removes bookmarks. Closing a browser abruptly can lose the last few seconds. Real recording format/device acceptance and Microsoft worker hosting remain outstanding.

Validation: 34 tests covering archive flow, offline lesson/sync regression, progress validation, bounds, expiry, corrupt/unavailable storage and authentication cleanup; TypeScript and production build. Chromium plays a synthetic WebM using realistic byte-range responses, renews playback access, waits for completed seeks, reloads and resumes, resets progress, and checks 390px/1440px layout without overflow. No live student data or provider actions are used.
