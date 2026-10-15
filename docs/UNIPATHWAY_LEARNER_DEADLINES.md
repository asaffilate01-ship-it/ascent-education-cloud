# Learner support deadline agenda

Universities Abroad now combines institutional support tasks across the signed-in learner's applications. The agenda includes overdue, next-seven-day, undated, completed and all-work filters, ten-row navigation and focusable links to the relevant application. Instructions and status remain read-only; staff use the existing support desk for changes.

Application reads retain explicit centre and student filters. Task reads use the centre plus batches of at most 100 application IDs obtained from those learner-scoped reads, with complete 100-row paging. Empty application lists issue no task query. A failed page discards all partial task results and displays a separate error while keeping successfully loaded applications available. Refresh retries both sources. A user/tenant key resets the workspace and pending loads are invalidated on unmount.

Dates display in the learner's local time and urgency refreshes each minute. Counts reflect the loaded snapshot. Completed support work does not imply admission or travel approval. No automatic messages, task mutations, external calls, new permissions or migrations are introduced.

Tests cover query scope, batching, later-page failure, stale responses, agenda filters/paging, read-only rendering and keyboard focus to the selected application. Full live browser/RLS validation remains a staging gate.
