# Adult residential accommodation planning

The director dated-calendar view now includes accommodation inventory and assignments for its selected visit. Rooms record site, unique room ID, male/female section, student/staff use, bed capacity and confirmed accessibility. Anonymous learner numbers map to the actual cohort size; staff use consistent IDs.

Validation prevents duplicate person assignments, duplicate room IDs, bed overcapacity, unknown rooms, out-of-cohort learner numbers, section mismatches, students sharing staff rooms and unmet accessible-room requirements. Student and staff beds have separate totals. Every unallocated learner number remains visible. Occupied rooms cannot be removed until their assignments are removed.

Versioned JSON draft files can be saved and reopened only for the matching cohort, visit, dates and headcount. Imports enforce schema and allocation rules before replacing state; the file limit is 150 KB. Data is not written to the production database. Save before switching visits; unsaved visit edits are discarded.

This does not reserve hotel inventory, check people in, confirm property accessibility, enforce adult admission eligibility or supply overnight staff coverage. Names, medical records and live student records are not loaded. Staff rooms are additional to student capacity as agreed. Property contracts, real rosters, transport and staff availability remain separate operational work.
