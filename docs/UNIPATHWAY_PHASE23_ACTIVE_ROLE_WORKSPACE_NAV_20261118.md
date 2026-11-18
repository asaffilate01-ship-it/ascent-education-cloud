# UniPathway Phase 23 — verified active-role workspace navigation

**Source-only security and UX hardening | 18 November 2026**

## Finding
The shared `/workspace` service directory rendered role-specific links based on `user.role` without checking membership in the current authenticated `user.roles` set. The sidebar also retained its search text/open mobile drawer across a centre or role change if the URL did not change (e.g. shared `/office`). Guarded destination routes and RLS still enforce actual access, but a stale workspace surface can mislead users about permissions and present confusing navigation.

## Fix
- Require a verified active-role membership before mounting the workspace directory, `StaffTaskBoard` or `WorkspaceActions`. Display an accessible guidance/denial state instead of stale service cards when membership is absent or withdrawn.
- Remount the authenticated workspace on account, centre, role or role-membership changes, resetting search and area filters.
- Suppress the sidebar for an unverified active role and close/reset the mobile drawer and search on role, centre, membership or pathname changes. Preserve original route mappings, current design tokens, focus trapping and keyboard support.
- Add React regressions for revoked roles, restoration after a legitimate switch, directory exposure and same-route centre changes.

## Boundaries
This is client defence in depth, not authorisation. Do not change database policies, platform role assignments or any centre records. All 21-role home routes and task shortcuts from Phase 21 remain unchanged. Real multi-role, two-centre JWT/RLS tests and physical-device screen reader acceptance remain P0/P2 operational gates.
