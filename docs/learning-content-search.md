# Learning content search

The shared workspace search now finds course titles/codes, lesson titles and material titles, alongside only the active role's navigation. It reads metadata only; it does not download files, expose storage paths, search private email, assessment evidence or other users' personal records.

Students are scoped to active enrolments and published lessons/released materials. Lecturers are scoped to modules assigned to them, including draft content they can manage. Both scopes use explicit tenant filters and existing database RLS. Other roles keep their own navigation search, with no learning-record queries. Missing identity or centre produces no record queries.

Search waits 250 ms after typing, requires two characters, limits input to 100 characters and uses up to eight literal words. Wildcards are escaped. Assignment reads are paginated in 250-row pages; content searches use up to 50 module IDs per request. Each group shows at most 12 matches, with a thirteenth result signalling that the user should narrow the query. No partial results are displayed when a source fails. This is bounded title search, not a full-text search index or unlimited-results browser.

Closing search or switching account, tenant or active role unmounts the query, aborts requests and clears its text/results. Query garbage collection is immediate after unmount. Old results are hidden while a replacement term is debouncing/loading. Errors show a retry action rather than reporting no matches.

Course results open their own module. Lesson results carry module and lesson IDs; teachers open the selected lesson in preview mode, with no automatic publication or saving. Material results open one authorized material, with a return to all module materials; withdrawn/inaccessible targets produce a clear message and no download. Navigation to student material/recording pages preserves module context. Existing independent marking, permissions and publication workflows are unchanged.

Verification: scoped query tests including 260 assignments, literal wildcards, partial failures and cancellation; real React/cmdk dialog tests for selection, stale-result removal, close/reopen, role switch and retry; material/lesson target tests; existing structured-lesson and coursework/material/guardian database harnesses; TypeScript; production build; synthetic mobile/desktop browser fixture in scripts/test-workspace-search-responsive.mjs.

Still outstanding: authorized search for admissions, staff records and communications, full-text document indexing, large-centre search performance testing, and real-account acceptance. No external provider connection is activated by this change.
