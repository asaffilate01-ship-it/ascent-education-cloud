# Knowledge review queue

The staff knowledge library now loads reviewed-text documents in complete 100-row pages, ordered by update timestamp and ID. Any failed page discards the partial result. Explicit loading, error/retry and empty states distinguish unavailable content from an empty library.

Reviewers can search title/reference, filter approval status and audience, and navigate twelve-document display pages. Existing editing, approval, withdrawal, revision checks and exact-passage search remain intact. Counts describe the loaded snapshot; Refresh review queue reloads it.

The workspace is keyed by centre, user, roles and learner mode. Switching scope resets editors/search results and invalidates pending reads; completed writes from an unmounted workspace do not update the new screen. Plain-text imports also check the workspace is still active before inserting their content.

No schema or permission changes, live provider requests or deployment are included. Tests cover complete paging, query scope, combined filters and later-page failure; live staging/browser checks remain outstanding.
