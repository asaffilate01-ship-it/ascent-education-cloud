# UniPathway classroom & dashboard reliability — 4 November 2026

## Built in source (no new dependency, no Lovable credits)
This phase keeps the **existing Microsoft Teams Education / Enterprise classroom** and durable private UniPathway whiteboard. It does **not** install a second meeting provider, perform automatic Graph enrolment or represent Microsoft tenant integration as active.

### Teams teaching and classroom workspaces
- A class user must have an explicit centre, an **active selected classroom role**, and the server's per-session invitation-gated teaching-plan response **before** the Teams teaching desk requests session details or boards. A secondary teaching membership never unlocks lecturer controls while student role is active.
- Session and saved-board responses are scoped to the centre and selected session, and a wrong-centre / mismatched response is rejected. The teaching plan's revision receipt must be a newer integer before the UI reports it as saved.
- Class-to-course navigation's TanStack Query key includes role, membership and centre, preventing cached educator links from leaking across account switches. The classroom and whiteboard views remount on role/centre changes.
- The Teams link remains an allowlisted HTTPS Microsoft Teams URL and stays gated by recorded session status and joining window. Planning breakout groups does **not** create or modify actual Teams breakout rooms; only Microsoft controls can do that.

### Large-class whiteboard usability
- The board remains an append-only, private server-authorised event log with one durable write per finished stroke, checkpoint + delta reconstruction and read-only student mode.
- Whiteboard Studio now rejects mixed-centre classes/boards, shows only boards from the user's authorised classes, and requires a matching centre/session receipt for creates and a matching centre/board/locked receipt for lock actions.
- A live board requires an active selected classroom role and centre; drawing requires verified current teacher/manager status and a board belonging to that centre. A secondary teaching role no longer grants editing while a learner role is active.
- The presenter can use a keyboard to place text at the middle of the board and privately export a **sanitised SVG of strokes/text only** (no student roster, meeting identifiers, IDs, backend credentials or recording metadata). Do not share exports until the centre has approved distribution; it is **not** an automatic release to students.
- Replay orders events by durable sequence even when cached provider results arrive out of order, excludes invalid operations and timestamps, and tolerates non-visible/zero-size canvas geometry without producing invalid points. Missing event sequences are flagged for refresh rather than silently reporting a complete view.

### Tests and deployment boundary
- Unit/source checks cover active roles, centre response verification, wrong-centre boards, role switching, save revisions, no uninvited session metadata reads, safe XML escaping, replay order and accessibility controls.
- The existing CI must pass typecheck, lint, test, database rehearsals, Edge checks, browser smoke, build, Android and iOS before merge.
- No SQL, migration, app registration, recording policy, network provider or live Supabase project was changed; the currently connected Supabase account exposes **DISHBEE**, not verified UniPathway.
- Source changes are **defence-in-depth only**. Hosted tenant/RLS negative tests with two independently signed-in UniPathway centres, enrolment/invitation revocation, data retention, Teams admin consent, real recording embargo (24h standard / 12h urgent) and actual connected device tests remain necessary.

## Why not install Excalidraw/Hocuspocus now?
The existing private whiteboard uses a verified append-only stroke/text protocol and is wired to multiple role-specific lesson surfaces. Dropping a new document format or real-time server in without a migration, attachment-rights review and two-centre RLS tests risks replacing functioning data with a second, non-interoperable board. This phase improves the working system and establishes clear requirements for a subsequent sandboxed Excalidraw/Hocuspocus adapter if its licensing, storage security and data model merit it.

## Follow-on work
- Review approved Microsoft Graph permissions/recording retention, with no new auth secrets in GitHub.
- A separate editor adapter proof of concept with import/export fidelity and no new production writes.
- Dashboard accessibility audits (axe-core/keyboard/contrast), error telemetry with PII scrubbing, and source-verified progression/assessment handoffs.
- The correct UniPathway staging project must be connected before production activation claims.
