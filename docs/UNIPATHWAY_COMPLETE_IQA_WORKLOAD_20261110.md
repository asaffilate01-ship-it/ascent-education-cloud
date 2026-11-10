# UniPathway — complete and fail-closed IQA reviewer workload

## Defect
The QA dashboard previously used `limit(200)` on an IQA officer's assignment list. A reviewer with more than 200 allocated attempts could see accurate-looking but incomplete statistics.

## Source fix
- Retrieve all assigned attempts using stable, 250-record paginated reads, with current-centre and reviewer filters.
- Retrieve the matching assessments in batches through the existing RLS-scoped paged helper.
- Verify returned rows again against the selected reviewer and centre. If a response includes a foreign row, an attempt is missing or any page fails, **discard the entire snapshot** and show an error with Retry.
- Continue to distinguish "human marked", "IQA approved awaiting separate release" and other allocated attempts. Totals remain advisory, not a grade or official awarding-body assessment.
- Keep the existing active IQA role requirement; do not show other centres' students or unallocated marks.

## Release
Unit tests exercise 251 allocations (with page 2), failure on page 2, foreign-centre response and a student with inactive IQA membership. No schema, role, grade release, sampling percentage or external EQA access is changed.

**Future:** For production scale, consider a server-side paginated view or safe centre-scoped aggregate with audited RLS. Do not replace the full-snapshot guarantee with an unverified count.
