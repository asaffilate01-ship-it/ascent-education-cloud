# Assessment workspace phase — 26 October 2026

The independent assessor workspace now defaults to submissions requiring marking, with title/reference search and an all-allocations view. The selected authorised attempt is retained in the URL. Account/centre changes remount the workspace and clear private edits. URL selection never bypasses the existing allocation queries or RLS.

Submitted text is shown with line numbers. Assessors can select a real line range and copy its exact quote and location into a rubric criterion. Invalid/empty/oversized ranges are rejected rather than silently truncating evidence. Replacing existing evidence requires confirmation. Citation fields are multiline so quotations retain line breaks. Document attachments retain their protected download flow; document page/filename references can be entered manually.

Four generic feedback prompts provide starting points for strengths, evidence, reasoning and practice. They append to individual feedback, never set scores, and must be personalised before submission. Bracketed placeholders are rejected by this UI. They are not a shared editable feedback bank and are not stored as student data. Each criterion has explicit completeness checks, and the submit action is disabled until every criterion and individual feedback meets the client validation thresholds. Server validation remains authoritative.

Unsent edits are indicated, switching submissions requires discard confirmation, and browser unload has an unsaved-edit warning. Drafts remain in memory: this is not server autosave and client-side route navigation can still discard edits. The existing protected `record_unipathway_human_mark` RPC stores the citations and feedback and sends the mark to separate IQA review. No grade is automatically released and no new privileges or database migrations were introduced.

Validation:
- Eight focused tests cover citation bounds, score/feedback limits, queue search/filter, authorised URL selection, replacement/discard protection, prompt personalisation, marking payload and account isolation.
- Existing assessment live-activation database test passed, including protected resources, guardian/coursework policy fixtures and legacy assessment activation checks.
- Browser integration at 390px and 1440px with a synthetic signed-in assessor/backend: no horizontal overflow, no page errors, multiline citation preserved and completed marking posted to the existing IQA RPC.
- TypeScript and production build passed.

Still outstanding: PDF/DOCX inline annotation, an institution-managed reusable feedback library, durable assessor drafts, pagination beyond the existing 300 allocations, and real staff/student acceptance. Teams account activation/worker hosting, institutional email hosting configuration, language-room audio, cloud lab provisioning, Pakistan merchant checkout and SCORM/LTI activation remain separate integration phases; this change does not certify those connections.
