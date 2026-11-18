# UniPathway Phase 20 — Task-led centre director navigation

**Scope:** source-only desktop/mobile navigation UX, 18 November 2026.

## What changed
The centre-director sidebar had a long menu mixing admissions, academic approval, staff, partners, compliance and system operations. Organise specialist links into five task-oriented collapsible sections: **Admissions & learners**, **Teaching & quality**, **Staff & centre operations**, **Partners & funding**, and **Systems & communications**.

Preserve the five existing Everyday destinations and the full `/workspace` directory. All original route paths, role membership checks, module context and search results are unchanged. New or unclassified routes appear under **Other services** rather than silently disappearing. Each expandable menu remains a semantic `<details>` with existing touch-sized controls, keyboard operation, and focus behavior at narrow widths.

## Acceptance
Automated navigation contracts verify that all director paths survive grouping *exactly once*, critical destinations appear in their correct group, and scoped navigation search still finds them while not mixing in student-only pages. Other roles are unchanged.

## Release boundaries
This change affects menu presentation only, not permissions, enrolments, centre data, Microsoft licences, IQA decisions or production deployment. Exact-head lint, types, tests, browser, DB/Edge, Android/iOS and design CI are required for merge; real-device accessibility and a signed-in centre-director pilot still require independent acceptance.
