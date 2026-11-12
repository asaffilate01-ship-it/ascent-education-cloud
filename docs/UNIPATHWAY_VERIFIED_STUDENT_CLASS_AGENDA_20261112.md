# UniPathway Phase 5 — reliable student class agenda (12 November 2026)

## Problem
The student "Today" dashboard already reads coursework over bounded 50-module batches, but its upcoming-class query used a single `IN(moduleIds)` filter and a global `LIMIT 5`. For large active enrolment histories this could exceed a safe filter size, or accidentally prefer sessions from the first queried group. A failure after partial data must never create a reassuring or misleading class recommendation. Previously shown sessions also lingered in the cards after their end time until an explicit refresh.

## Source implementation
- Query **at most 50 distinct enrolled module IDs** per authorised RLS-scoped request, with `tenant_id`, `scheduled/live` status and `ends_at` restrictions.
- Request at most **10 sessions per module chunk**; wait for every chunk before publishing any result. Validate returned `tenant_id`, `module_id`, `status`, IDs, titles, timestamp order and per-chunk count, rejecting inconsistent or over-limit replies.
- Sort the verified multi-chunk result by actual start time (ID tie-break), retaining a 10-session reserve so the UI can still show the next five when a session expires. Refresh the visible list using the existing minute tick without unnecessary repeated database queries.
- **Fail closed** on any denied or malformed chunk: show a clear retry state, leave independently retrieved coursework visible, and withhold source-grounded AI/study focus until both authorised datasets are valid.
- Keep all classroom actions linked to their exact student module/session; the destination checks true invitations separately. A module session listing does **not** establish a Microsoft Teams invitation, attendance, award, mark or enrolment.

## Testing
Unit tests cover 121 modules / 3 batches, global chronological ordering, duplicate IDs, invalid or cross-centre rows, malformed start/end dates, expired sessions, over-limit batches, cancellation and no-enrolment no-query. React integration verifies centre/module isolation, all chunks requested and no leaked first-batch cards when a later chunk fails.

Require exact-commit production CI (TypeScript, lint, unit, database/Edge, browser) and Android/iOS builds before merge. The UI remains designed for 360/390/768/1440px, 200% reflow and 44px actions, but real device and authenticated multi-centre acceptance remain separate release requirements.

## Deployment boundary
GitHub source and test changes only. No Lovable credits, paid AI calls, live Supabase migrations, provider credentials, service-role access, private storage changes or actual Microsoft Teams activation.
