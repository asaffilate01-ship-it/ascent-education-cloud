# Assessment revision history and larger queues

27 October 2026.

The independent marker and IQA queues previously read at most 300 allocations, silently hiding additional work. Both now read complete tenant/RLS-filtered snapshots using 250-row requests and identifier batches of 50. Failed or superseded reads do not expose a partial queue. Cards display 25 submissions per page; search applies to all loaded allocations. Selection remains in the URL and the open assessment stays selected when paging. This remains a complete client-side snapshot, not a server-side search index or streaming queue.

Submitted mark history now captures full criterion scores, reasoning, evidence, missing-work notes, feedback and marking timestamp at the point each revision is recorded. A trigger requires the historical totals, marker, tenant and revision to match the current submitted mark. It uses the established marking RPC transaction; students cannot write history and no grade-release workflow is bypassed.

Only an exact currently retained mark revision is backfilled. Older revisions without a surviving full snapshot retain their totals and explicitly show that detailed reasoning was not captured. No historical feedback is invented. Personal saved draft events remain metadata-only and are separate from submitted decisions.

Markers and IQA reviewers can load ten submitted revisions at a time and compare their original feedback, criterion evidence and score changes. Comparisons are read-only and use the existing private marking RLS boundary. There is no restore/publish/release action in the history panel.

## Validation

- 33 component/unit checks across existing marking, IQA, released results, new snapshot comparison and queue pagination/navigation. Includes 351 allocations, later-page failures, tenant filtering and preserving selected work while paging.
- PostgreSQL: 41 coursework/IQA checks, including distinct snapshot retention, reviewer reads and denial for student/peer/teaching lecturer; 7 separate snapshot backfill/mismatch/preservation/function-grant checks. Existing 7 protected-material and 15 guardian checks also pass.
- 200-migration synthetic schema rehearsal, with provider-owned extensions deferred.
- TypeScript and production build pass.
- Exact production rollback rehearsal succeeded before applying `20261027160742_assessment_revision_snapshots.sql` and its migration ledger record. Live verification confirms RLS enabled, no anonymous SELECT, no direct authenticated UPDATE and no anonymous execution of the capture function. No real student marks were created or released.
- A responsive Chromium script is included, but a fresh visual run was blocked: the earlier browser binary had been removed and replacement downloads failed. Component tests do not replace real mobile/desktop browser acceptance.

## Remaining

PDF/DOCX inline annotation, institution-approved shared feedback, advanced course-content compatibility and other external integration work remain open. Real-account reviewer acceptance and verified website publication are separate from merging.
