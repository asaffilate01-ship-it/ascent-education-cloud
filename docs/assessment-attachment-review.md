# Assessment attachment review

Submitted coursework now has an explicit Review attachment action alongside Download, available through the existing account/attempt-scoped attachment list. One document is open at a time. PDF pages render locally using pinned PDF.js 6.4.299 and its bundled worker; PNG/JPEG display locally. No document is sent to a third-party viewer or AI service. DOCX now has a bounded, local text view alongside Download and manual paragraph/table references; original page layout is not reproduced.

Markers can attach a filename, page/location and quotation/observation to a rubric criterion. Replacement requires the existing confirmation, then Save private draft persists it through save_uni_marking_draft. Submitting the human mark carries the reference into criteria_scores and the submitted revision snapshot. This adds no grade-release path or automatic scoring. IQA and other authorized readers get a read-only preview.

Private storage downloads are on demand, no-store, abortable with a 30-second timeout, checked against manifest MIME and size. Blob URLs are revoked on close, refresh, file switch or account/attempt unmount. No localStorage or IndexedDB cache is introduced. Original submitted files cannot be edited here. Existing Storage/RLS policies remain the access boundary; there is no schema migration or expansion of grants.

PDF rendering uses a bounded canvas, one page at a time, with optional extracted text (20,000-character limit). Document links, scripts, interactive forms and attachments are not exposed. Password-protected, corrupt and unsupported PDFs retain Download as a fallback. Page count validation blocks references beyond a successfully opened document. Manually entered quotations remain the marker's responsibility.

Validation:
- 44 attachment, marking, IQA and revision-history unit/UI checks.
- Existing actual-Postgres harness: 41 coursework, 7 material and 15 guardian checks.
- TypeScript and production build.
- Browser fixture: scripts/test-attachment-review-responsive.mjs generates its own two-page PDF and uses a synthetic backend. Run against a production preview on port 8080 with CHROMIUM_PATH if needed; no real student records or assessment decisions are modified.

Still outstanding: freehand/rectangle overlays, full DOCX layout rendering/annotation, multiple independently editable annotation threads, institution-approved shared feedback, and live enrolled-account/device acceptance. Page references are stored as rubric evidence, not geometric PDF annotations. This phase does not complete provider activation for Omniqora, Teams, hosted email, payments, language audio or cloud labs.


## Evidence discovery phase — 28 October 2026

Submitted-text review now has a local, case-insensitive literal search with numbered matching-line counts, previous/next navigation, keyboard Enter/Shift+Enter, Escape clearing, and a focused reset. All source lines remain visible and unchanged. An assessor can select a matching line, review it, then separately copy the citation; selection never assigns marks or saves/submits a draft. Read-only IQA review has search without citation controls.

A declined replacement now explicitly reports that the existing criterion evidence is unchanged. A successful copy reminds the assessor to save the marking draft; it does not claim server persistence.

PDF page text preserves extractable line endings and uses the same reader. Search is limited to the current page's existing 20,000-character extraction, resets on page/document changes and survives zoom. Zoom resizes the bounded canvas without reloading/re-extracting the page. Scanned pages continue to require visual review/download. This is text navigation, not whole-document OCR or geometric annotation.

The shared role workspace directory also supports combined service-area and text filters, contextual counts and a clear action. Active-role changes remount and clear filters; links continue to preserve module context only on supported destinations.

No schema, storage grant, provider setting or assessment release logic changed. The UI UX Pro Max search guidance used here covers no-result recovery, contextual feedback and visible navigation. Framework versions, branding and existing data boundaries are retained. Multiple annotation threads, freehand overlays, full DOCX layout rendering/annotation and institution-shared feedback remain outstanding.


## DOCX main-document text view — 28 October 2026

Opening a submitted DOCX now downloads through the same authorised private Storage path, checks manifest MIME/size, and extracts `word/document.xml` locally. Only this member is decompressed, using pinned fflate 0.8.3; other archive members are not rendered or loaded. React displays plain text with paragraph and table/row/cell references and the shared evidence search controls. Links remain plain text. Original layout, images, headers, footnotes and comments require Download; this is not a paginated Word renderer, OCR or annotation editor.

Bounds: existing 20 MB archive limit, 512 entries, 2 MiB extracted XML, 20,000 XML elements, depth 64, 2,000 paragraphs and 100,000 output characters. Over-limit, corrupt, ambiguous duplicate-part and unsupported tracked-revision/altChunk documents fall back to original-file review. XML document/entity declarations are rejected. Parsing yields for abort/paint and shares the preview timeout. Account/attempt remounts and closing clear private text/search; no document content is stored locally or sent to a third-party viewer.

Manual citations still use the existing criterion, confirmation, private-draft and human-mark workflow. Declining an attachment-reference replacement clears stale copy-success feedback. No schema, grants, enrolment, AI scoring or grade-release changes are included.

The browser acceptance fixture includes a generated DOCX with paragraphs/table text and no real student data. It checks search, mobile/landscape/desktop width, preview cleanup and zero marking calls, alongside the PDF journey.
