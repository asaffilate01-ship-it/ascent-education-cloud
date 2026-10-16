# Combined residential operations workspace

The dated calendar now owns support and accommodation state for every edited visit. Selecting another visit no longer discards appointments, teaching tutor allocations, rooms or bed assignments. This supersedes the earlier per-visit save-first limitation in the support and accommodation phase notes.

A whole-workspace JSON file includes the calendar and all edited visit operations. Opening validates the complete file before replacing state, including all previous support and room validation rules. Imports reset closure review. File size is limited to 3 MB; existing per-visit parsers retain their own limits. No individual names or live student records are loaded.

Visit identity includes cohort, visit number, start/end dates and student count. Calendar edits retain obsolete records rather than silently assigning them to new dates. Combined saving is blocked while obsolete records exist or support clashes remain. Staff may restore the old calendar to recover records or explicitly remove obsolete allocations. Existing calendar-only and per-visit files remain supported.

This is portable file persistence plus in-memory editing, not shared database persistence or published bookings. Leaving or reloading the page still requires a saved workspace file. Staff availability, live roster binding, booking capacity enforcement, transport and external property reservations remain outstanding.

Tests cover combined round-trip, closure re-review, duplicate/stale visits, invalid support data and preserving rooms across visit switches.
