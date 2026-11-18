# UniPathway — Phase 21: all-role dashboard contract and navigation audit

**Prepared:** 18 November 2026. **Evidence:** current repository source and CI, not authenticated production operation.

## Scope
Review the configured 21 roles and their primary dashboard routes, all-role Quick access navigation, role switching, source-dependent dashboard states and availability claims. The existing `npm run audit:dashboards` source inventory supplements this review.

## Findings
- Every configured role has a routed landing page. Students, lecturers, admissions, finance, centre directors, platform owners, IQA, assessors, partners and the other roles use role-specific protected-route wrappers. This is source evidence, not proof of JWT/RLS permissions.
- The Quick access strip previously served only six roles. Fifteen other roles had to rely on the longer sidebar/service directory for common workflows. This patch supplies 3–4 stable, real route-backed shortcuts to **all 21 roles**.
- Shortcut visibility now requires current active-role membership and the role's exact home route. A dormant second role cannot expose stale dashboard shortcuts when users change workspace roles.
- Maintained routes **already** use `IndependentMarkerQueue`, `StudentCoursework` and `LandlordDashboard`. Unused legacy `AssessorDashboard`, `StudentAssignments` and `SuperadminDashboard` source files remain as cleanup candidates but are not the live routed entrypoints. A regression test protects this.
- Source dashboards generally separate verified role, loading and errors. Full independent acceptance is not complete: many provider integrations, Microsoft invitations, payments, role-specific enterprise features and external EQA access remain gated by live setup and validated permissions. No external sign-off or production readiness is claimed here.

## Tested source contracts
The additional tests check 21 registered roles, home route guard presence, complete Quick access coverage, no duplicate/missing shortcut routes, active-role switch denial, and maintained page entrypoints. Routes and their existing data-entitlement contracts have not been changed.

## Follow-on backlog
1. **P0:** live two-centre authenticated JWT/RLS and Storage negative tests, audit of privileged database functions, backup/restore, reviewed forward-only migration parity.
2. **P1:** linked admissions, qualification approvals, centre/course content, marking/IQA, Teams/Graph, institutional payments and email with real provider acceptance.
3. **P2:** actual Android/iOS touch accessibility, 200% zoom, keyboard focus, slow/offline recovery, performance and 3,000 learner load evidence.

## Release requirements
Exact-head lint, typecheck, test, DB/Edge, browser, manifest, Android/iOS and design CI. A successful PR and green synthetic checks are not proof of production deployment, accessible real devices, provider activation or academic approval.
