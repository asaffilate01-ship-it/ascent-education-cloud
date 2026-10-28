# Saved learning management

The signed-in downloads screen and standalone offline reader share search and availability filters. Search covers lesson titles, body text and transcripts, plus file titles. Saved files show ten cards per page; search/filter changes return to the first page. Clear filters restores the full library. Storage totals include lesson packs and files, and distinguish available from expired copies.

Remove expired copies asks for confirmation and preserves any lesson pack containing unsynced progress. Each deletion rereads the current record inside an IndexedDB read/write transaction, protecting content refreshed or work queued in another tab after the screen loaded. Account ownership is checked through the existing active-account transaction guard and on the stored record. Partial failures report an error; protected copies are retained. Individual removal and Clear saved learning retain their existing explicit confirmations for unsynced work.

No new backend grants, provider connections or media-download allowances are introduced. The existing 24-hour expiry, 20-file/25-MB per-file/100-MB total limit and offline access limitations remain. Search does not query the network or index content belonging to another account.

Validation: 23 targeted UI/offline tests, TypeScript and production build. The production-service-worker browser fixture checks cold offline startup, reload, local search/availability filters, expired-file removal in real IndexedDB, queued lesson completion surviving removal, authenticated reconnection sync, cross-tab account removal and mobile/desktop layouts with synthetic API data.
