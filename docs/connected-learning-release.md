# Connected learning release — 25 October 2026

This is the first implementation group from `competitor-gap-review.md`. It does not close the full gap register.

## Implemented

- One keyboard-accessible search dialog with focus management, active-role navigation and assigned-course search. Student/lecturer course queries use tenant filters and database RLS. Removed unsupported student/finance search categories. Searching all authorised record types is still outstanding.
- All remaining direct AI model calls route through `_shared/omniqora.ts`. The gateway derives account and tenant from verified authentication/database records, checks feature roles, enforces the existing durable shared account allowance, restricts response size and timeout, prohibits redirects and fails closed without configuration. Model selection remains with Omniqora. The separate tutor adapter already uses Omniqora.
- Retired legacy plagiarism scoring with HTTP 410: it could manufacture authorship scores and mutate submissions using privileged access. Evidence-backed academic-integrity triage and independent human assessment remain separate. Formative feedback no longer instructs the model to issue a grade without evidence/rubric.
- Structured module lessons: teacher authoring, ordering, text/video/transcript/resource links, preview, draft/publication/archive, optimistic revision checks and immutable version snapshots.
- Student lesson workspace: current-version progress, exact video position saved every 15 seconds and on pause, explicit completion, next lesson and retained module context. Completion is self-reported study progress, never an assessment result.
- Work queues in My Workspace for admissions/director/finance/agent/lecturer. Failed sources show a retry message rather than an empty queue. These are review links; ownership assignment and bulk mutation remain outstanding.
- Tuition Academy terminology now consistently says Years 8–12.

## Database deployment

Applied and catalog-verified on the live UniPathway backend:

- `20261022085303_unipathway_admission_handover.sql`: reviewed atomic learner/programme handover; confirmed matching learner account and active same-centre programme required. It does not verify NADRA, collect payment or send class invitations.
- `20261025210004_study_tutor_fair_usage.sql`: shared account limit of 50 requests per Pakistan calendar day and 5/minute; service-only consumption RPC.
- `20261025234519_structured_lessons.sql`: lesson, version and progress tables with seven RLS policies. Reasserts exclusive handover insertion when that RPC exists.

Verified RLS on all five new tables, no anonymous quota RPC execution, and no direct authenticated INSERT privilege on enrolments. No real student enrolments or classroom assignments were invented. Withdrawal removes lesson/progress read access. A full live cohort acceptance test still needs the approved roster.

## Omniqora activation contract

New legacy-feature connector requires server secrets `OMNIQORA_AI_URL`, `OMNIQORA_AI_TOKEN` (at least 32 characters), and `OMNIQORA_AI_TENANT_ID` matching the verified centre. HTTPS endpoint receives:

```
{ product: "unipathway", purpose, requestId, userId, tenantId,
  messages, maxOutputTokens, temperature, responseFormat }
```

Return `{ "reply": "..." }`. Structured tools require JSON in the reply string. Omniqora must authenticate the product credential, allowlist tenant/purpose, apply tenant budgets and retain request-ID audit records without logging learner content by default. No direct-provider fallback is supported. Endpoint credentials, central tenant budgeting and edge-function deployment have not been verified live. The existing tutor retains its documented `OMNIQORA_TUTOR_*` endpoint contract. Twilio communication gateway credentials are unrelated to AI routing.

## Validation

- 24 real PostgreSQL lesson checks: draft/publication visibility, assignment boundaries, cross-tenant denial, URL and transcript validation, version snapshots, progress ownership, withdrawal and destructive-grant denial.
- 107 existing core assignment/RLS checks.
- 6 connector checks: missing configuration, role denial, fair use, verified identity, response compatibility and absence of direct AI provider routes.
- Five unit tests for current-version completion, exact activity selection, URL validation and role-scoped navigation.
- Full 186-migration synthetic PostgreSQL rehearsal, including admission handover tests; provider extensions/acceptance remain deferred.
- TypeScript and production build. Responsive browser interaction checks at 320, 390, 768 and 1440 pixels use synthetic authenticated lesson fixtures, not production accounts.

## Remaining acceptance work

| Audit group | Still required |
|---|---|
| Live operational completeness | Reconcile remaining modern classroom/materials/assessment schemas; approved staff/student roster; real two-course/two-tenant acceptance |
| AI | Deploy edge functions; connect Omniqora endpoint/secrets; central tenant budgets and production audit verification |
| Admissions | Identity/eligibility evidence, payer agreement, funding, cohort/class assignment and provider invitation reconciliation |
| Learning/authoring | Protected inline documents, reusable approved units, release rules, revision restore UI and captions |
| Staff/search | Queue ownership, due dates for every task, safe bulk operations; actual permitted student/resource/finance record search |
| Scheduling | Server-enforced concurrent overlaps, cohort/capacity/travel constraints, cancellations/substitutions and provider notices |
| Marking | PDF/image/stylus annotation and feedback bank while preserving independent assessor/IQA controls |
| Funding/commerce | Sponsor ledger and claims, five-subject packages, device terms, instalments/refund-linked access |
| Mobile/accessibility | Authorised offline packs, resumable uploads, account-safe cache deletion; full screen-reader, contrast and document/caption acceptance |
| Standards | Safe SCORM runtime, LTI 1.3 registration/launch/grade return, optional H5P/xAPI integration |
| Family/analytics | Multi-child weekly actions, consent-aware summaries and explainable intervention ownership |
| NADRA/CCTV | Approved provider credentials, retention/consent decisions and live identity/playback acceptance |
| Language | Complete English/Urdu operational content and tested RTL layouts |

Keep the lesson tables and historical versions when rolling back the frontend. Do not drop learning records as an application rollback. Saved public HTTPS lesson resources are shareable links; confidential class recordings must use the protected classroom storage workflow.
