# UniPathway Phase 18 — P0 active-role isolation in launch-readiness dashboard

**Scope:** source-only client defence in depth; 18 November 2026.

## Finding
The launch-readiness page previously checked whether a user **possessed any** director or superadmin role, rather than whether the user's **currently active** role was a verified leadership assignment. On a multi-role account, changing the active role to student could leave leadership UI/evidence accessible until the page or backend independently denied the read.

## Change
- Require a current active `superadmin` or `centre_director` role **and** presence in the verified assigned-role set.
- Show the course-offer editor **only** to an active verified superadmin, not merely a holder of a dormant superadmin assignment.
- Re-key the evidence workspace by user, centre **and active role**, so switching leadership contexts cannot reuse a prior component state.
- Provide an accessible denial state and regressions for dormant roles, stale role switching, invalid role claims, and the positive active-superadmin case.

## Limits and production gates
This does not confer new rights or alter RLS. Actual Postgres policies and RPC authorisation remain the security boundary. It does **not** prove the two-centre signed-in staging matrix, grants/trigger review, backup/restore or readiness register completion. Those P0 items remain blocked pending verified isolated staging, real owner credentials and authenticated negative tests. Do not mark launch ready from this PR alone.
