# Assessment attachment review

Submitted coursework now has an explicit Review attachment action alongside Download, available through the existing account/attempt-scoped attachment list. One document is open at a time. PDF pages render locally using pinned PDF.js 6.4.299 and its bundled worker; PNG/JPEG display locally. No document is sent to a third-party viewer or AI service. DOCX remains a download with a structured heading/paragraph/table reference.

Markers can attach a filename, page/location and quotation/observation to a rubric criterion. Replacement requires the existing confirmation, then Save private draft persists it through save_uni_marking_draft. Submitting the human mark carries the reference into criteria_scores and the submitted revision snapshot. This adds no grade-release path or automatic scoring. IQA and other authorized readers get a read-only preview.

Private storage downloads are on demand, no-store, abortable with a 30-second timeout, checked against manifest MIME and size. Blob URLs are revoked on close, refresh, file switch or account/attempt unmount. No localStorage or IndexedDB cache is introduced. Original submitted files cannot be edited here. Existing Storage/RLS policies remain the access boundary; there is no schema migration or expansion of grants.

PDF rendering uses a bounded canvas, one page at a time, with optional extracted text (20,000-character limit). Document links, scripts, interactive forms and attachments are not exposed. Password-protected, corrupt and unsupported PDFs retain Download as a fallback. Page count validation blocks references beyond a successfully opened document. Manually entered quotations remain the marker's responsibility.

Validation:
- 44 attachment, marking, IQA and revision-history unit/UI checks.
- Existing actual-Postgres harness: 41 coursework, 7 material and 15 guardian checks.
- TypeScript and production build.
- Browser fixture: scripts/test-attachment-review-responsive.mjs generates its own two-page PDF and uses a synthetic backend. Run against a production preview on port 8080 with CHROMIUM_PATH if needed; no real student records or assessment decisions are modified.

Still outstanding: freehand/rectangle overlays, native DOCX rendering/annotation, multiple independently editable annotation threads, institution-approved shared feedback, and live enrolled-account/device acceptance. Page references are stored as rubric evidence, not geometric PDF annotations. This phase does not complete provider activation for Omniqora, Teams, hosted email, payments, language audio or cloud labs.
