# Next phases: private agreements and reviewed knowledge

Built on PR #20's application and Factory event work. These changes are source-complete and locally tested; they have not been applied to a live Supabase project.

## Private agreement evidence

Directors and superadmins can upload a signed PDF (up to 10 MB) when registering an agreement. Uploads use a dedicated private `partner-agreements` bucket, a tenant/partner/random-file path, a PDF MIME allowlist, and client PDF-header validation. Uploading a document is not verification of its signatures or contract terms.

The database registers only an existing object at the correct tenant/partner path and derives the agreement reference itself. Client roles cannot overwrite or delete files. Finance can read its own centre's documents, but cannot upload or register them. Students and other tenants cannot read files or document metadata. Restrictive policies maintain these boundaries even if another permissive storage policy is introduced.

Downloads use a 60-second signed URL with attachment disposition. Previously issued URLs can remain usable until their short expiry; do not treat them as instantly revocable. If a managed file is removed administratively, its agreement can no longer support pathway publication. Legacy references to controlled external document systems remain supported.

If the file uploads but metadata registration fails, the UI reports the incomplete operation. An operator should reconcile the orphan object before retrying; the registration RPC itself is idempotent. No destructive client cleanup of evidence is implemented.

## Reviewed education knowledge

Staff routes:
- `/director/knowledge`
- `/landlord/knowledge`
- `/programme/knowledge`

Learner route: `/student/knowledge`.

Directors, superadmins and programme leaders can enter document text or import TXT/Markdown, record its source reference and choose learner-visible or academic-staff-only visibility. Drafts are not visible to learners. The reviewer can inspect the full text before approval.

Approval atomically indexes exact source text into bounded, overlapping passages. Search uses PostgreSQL full-text ranking and returns the exact passage, source reference, document ID, revision and passage number. It does not generate an answer, send content to a model, consume model credits or claim vector retrieval.

Editing an approved document increments its revision, resets it to draft and removes its indexed passages immediately. A stale edit or approval is refused. Withdrawal removes the passages from retrieval. An audit record captures each draft/review decision and actor. Retained audit events do not constitute full historical copies of withdrawn source text.

The existing `omniqora-education-retrieve` endpoint retains metadata results and course/module filtering and adds source passages/citations for unscoped searches. New reviewed-text documents are a centre-wide corpus: course/module-scoped requests do not fall back to unrestricted centre-wide text. The index endpoint now reports actual approved-document index state instead of returning a provider-required placeholder. Indexing occurs in the review transaction.

Limits: 200,000 characters per document; search queries up to 1,000 characters; up to 20 passages per RPC (UI requests 10). TXT/Markdown import is capped at 800 KB. PDF/Word extraction, OCR, per-course document assignment, embeddings, semantic reranking and model-generated RAG answers remain separate work. Staff must not place restricted marking material or personal student records in learner-visible documents.

## Validation

- `npm run test:db`: 67 PostgreSQL/PGlite integration checks. Includes executing both new migrations against a fixture with Supabase-shaped storage tables, tenant/role helpers and relevant preceding education/partner migrations. This validates SQL and RLS logic, not the deployed Storage HTTP service.
- `npm test`: 38 unit/component tests, including source citations, no-result behaviour, PDF validation and upload/registration failure paths.
- TypeScript, lint and production build checks, plus `git diff --check`.
- Education table types regenerated from replayed migrations.

## Before deployment

1. Replay the complete migration history in Supabase staging, including `20261015180000_private_partner_documents.sql` and `20261015181000_reviewed_knowledge_library.sql`.
2. Verify bucket permissions and the upload/download flow using real director, finance, student and other-tenant sessions. Inspect existing storage policies; these tests do not replace a real service test.
3. Check draft → review → search → edit → reapproval → withdrawal in the browser, including a centre switch.
4. Deploy the updated retrieval/index Edge Functions and web bundle. Confirm no old service worker caches authenticated responses.
5. Complete the remaining release gates in `UNIPATHWAY_RELEASE_2026-10-15.md`: staging lifecycle, provider credentials/connectors, live Factory activation, teaching/payment operations and academic approvals.

No partner messages, applications to providers, live credentials, production migrations or deployment were performed in this phase.
