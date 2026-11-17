# UniPathway — Phase 10: verified academic authoring and editable class records

**Prepared:** 17 November 2026. **Scope:** source-only guardrails for existing staff assessment and classroom journeys.

## Changes
- Apply one strict timezone-qualified academic instant parser to saved lecturer assessment briefs and insert-readback confirmation, rejecting invalid calendar dates, missing offsets, date-only and reversed bounds before a lecturer can act on a brief.
- Verify the entire centre/assigned-module class schedule snapshot for valid ordered starts and ends, IDs and uniqueness before exposing edit/cancel or scheduling actions. Corrupt or cross-scope rows show a retry/error state, not a misleading empty timetable.
- Only populate the Pakistan-time class editor or class join/preview guidance from unambiguous saved time bounds. Do not silently coerce a stored timestamp using a browser's locale.
- Preserve the fixed Asia/Karachi UTC+5 editor conversion, RLS-scoped queries, existing role guards, explicit save/cancel receipts and Microsoft delivery confirmation separation.
- Add synthetic unit and classroom flow regressions covering bad dates, missing offsets, duplicate/cross-tenant rows, reordered valid sessions and equivalent UTC/+05:00 receipts.

## Release and operational gates
- Run exact-head TypeScript, lint, Vitest, browser, DB/Edge, native and design CI where configured before merge. Only report a gate as passed when GitHub reports success.
- This patch does **not** repair invalid historical Postgres rows; authorised staff must correct upstream imports/admin entry safely after checking with the learner and their academic centre.
- No schema/RLS migrations, approval automation, automatic grades, provider credentials, enrolment changes, live Microsoft invitations or AI decisions are included.
- Production acceptance remains blocked on hosted authenticated two-centre RLS/Storage, provider/admin activation, Microsoft sessions and physical-device accessibility.
