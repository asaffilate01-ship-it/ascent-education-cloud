# Residential allocation overview and validation repairs

The director workspace now lists every scheduled visit, including untouched visits. It reports teaching sessions without tutor IDs, learners without rooms, optional support uptake, allocated support hours and validation conflicts. Review buttons select the corresponding visit. A CSV exports the same counts with closure-review, unscheduled-visit and obsolete-plan totals.

Optional support is not a completion requirement. Entered allocations complete is deliberately narrower than operational readiness: staff availability, contracted accommodation, transport, approvals and published learner schedules remain outside this view.

Repairs: combined workspace validation now includes room conflicts alongside support conflicts. The support import object has a strict schema and cannot include its own visit/version envelope fields. Existing valid workspace files remain compatible. An unsaved-edit indicator and browser beforeunload handler warn on refresh/close when the workspace differs from the last full draft download. This is not autosave and does not intercept every in-app route change.

No database migration, live booking, publication or deployment is performed. Portable-file persistence remains the current storage model.
