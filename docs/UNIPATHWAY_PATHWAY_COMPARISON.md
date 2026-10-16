# Pathway comparison

Learners and staff can select up to three available catalogue routes and compare destination institution/country/programme, qualification and level, entry stage, grade requirements, English requirements and pathway type in an accessible table. Missing information remains explicitly unrecorded.

Selection survives search filters and catalogue paging. Each selected route can be removed, or the comparison cleared. Selections exist only in component state and reset when the catalogue unmounts or its tenant/mode key changes. The comparison derives its data from currently available routes; unpublished or no-longer-verified learner routes disappear immediately and their selection is pruned.

This is a decision aid only: it creates no application, shares no personal data and makes no admission decision. The implementation adds no database schema, permissions, storage, external links or provider calls. Tests cover the selection limit, requirement display, missing values, filter/page continuity, removal and loss of publication eligibility.
