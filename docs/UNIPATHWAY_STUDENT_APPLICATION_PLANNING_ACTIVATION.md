# Private student application planning

This is a reviewed, inactive forward patch, not an automatically applied migration. The public scholarship planner remains separate and temporary. The student academic calendar displays a separate private planning panel, never writes personal planning entries into centre-wide academic_events, and defaults to disabled.

## Required release gates

1. Connect and identify the actual UniPathway project, review the existing tenants, profiles and user_roles schema and take an approved backup. Never run this patch against Dishbee.
2. Rehearse scripts/activation/unipathway-student-application-planner-forward.sql using the actual predecessor schema in an isolated environment. Run scripts/test-student-application-planner-db.mjs and the frontend tests; inspect database advisors.
3. Apply the reviewed patch only to the authorised target. Confirm its private activation table is disabled and both the public read RPC and table fail closed.
4. Test two students in one centre, a student in another centre, staff-only memberships, unauthenticated access, revoked student membership, suspended centres, duplicate entries, restricted column updates and removal of own entries using actual hosted sessions.
5. Confirm Data API exposure, least-privilege grants and non-exposure of the private helper schema. Ensure server membership policies match the actual deployment. The server checks centre-specific student membership; the UI also requires the selected verified student role.
6. After acceptance and owner approval, enable the server gate using the privileged operator, then enable VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED in the approved production build. Disable the browser flag and server gate if acceptance fails.

Records are private to the student account and current centre. No automatic reminder delivery, admissions submission, actual university deadlines, cross-device hosted verification or import of temporary public drafts is implied. No personal identity documents or financial details should be recorded. Student account closure, centre reassignment and data retention/deletion procedures must be reviewed before activation. No source URLs are retained in the private register. The snapshot is capped at 500 items and fails closed on overflow; review administrative recovery if needed.

The isolated test is not a substitute for real hosted RLS acceptance. No database change was applied by this repository commit.
