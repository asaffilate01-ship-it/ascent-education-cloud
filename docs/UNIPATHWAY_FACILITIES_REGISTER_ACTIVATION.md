# Facilities register activation

The forward patch in scripts/activation/unipathway-facilities-register-forward.sql is not an automatic migration. It depends on the existing physical security schema and verified_reader function. Do not apply to Dishbee or any unrelated project.

## Release gates

- Verify target project, schema, backup and operator authority.
- Rehearse the patch in a disposable database against the actual predecessor schema.
- Verify that the facilities gate starts disabled, and that anonymous users have no table access.
- With the gate disabled, authenticated centre users must receive no rows and inserts must fail.
- With both physical reads and facilities enabled in the test environment, a centre director can register an asset and append an inspection for their own active centre.
- Security officers can read their centre's records but cannot insert; unrelated roles and users without verified centre membership must be denied.
- Attempt cross-tenant reads, inserts, inspection foreign keys, spoofed actor/timestamps, duplicate case-insensitive asset references and future inspection dates. All prohibited operations must fail.
- Verify updates and deletes are unavailable to browser roles and existing inspection history cannot be overwritten.
- Review database advisors and access logs before activation.

No physical asset or inspection data is seeded. No equipment compliance or live installation status is implied. Dedicated facilities-manager and superadmin access requires a separately reviewed centre delegation model. The temporary inspection planner remains separate from the persistent register.

## Read workspace and acceptance tests

After successful rehearsal of the original facilities forward patch, rehearse and apply `scripts/activation/unipathway-facilities-register-read-forward.sql` in the same verified UniPathway environment. It exposes a security-invoker, centre-filtered snapshot of up to 500 assets and 1,000 inspections; oversized or unverified snapshots fail closed.

The existing `scripts/test-unipathway-physical-security-db.mjs` CI suite now rehearses both facilities patches against its isolated PGlite fixtures. It exercises the default-off state, both activation gates, role permissions, cross-centre isolation, duplicate asset references, spoofed actors, inspection dates, append-only history and suspension. Run the full rehearsal and frontend tests before release. A synthetic CI pass is not a substitute for hosted database acceptance.

Keep `VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED` disabled until the reviewed database patches, hosted API exposure, access tests and operator approval are confirmed. The new workspace is read-only and shows an explicit unavailable state rather than displaying unverified records. It never persists the temporary planning drafts. No inspection data or equipment is assumed.

## Write commands (third forward patch)

After the two previous patches, rehearse scripts/activation/unipathway-facilities-register-write-forward.sql in an isolated database. This patch removes the predecessor's direct browser INSERT grants and policies, leaving reads unchanged. It adds a private default-off write gate and an atomic, centre-serialised command path with an exact-payload idempotency ledger. The public RPC is SECURITY INVOKER; its private implementation checks the authenticated actor, current centre director membership, active tenant and all server gates. Client-supplied actors and timestamps are not accepted.

Verify that security officers retain read-only access and directors cannot write until the new gate is explicitly enabled. Test anonymous and cross-centre denial, missing or changed request identifiers, duplicate asset codes, foreign asset references, future inspection dates, write-capacity limits, exact request replay, private receipt isolation and immutable inspection history. New writes are capped at the existing 500 asset / 1,000 inspection snapshot limits. Before reaching these limits approve a paginated history and retention solution; never silently delete records to create capacity.

For hosted acceptance, apply the reviewed patches only to the correct authorised UniPathway project and verify the Data API exposes the invoker wrapper but not the private schema. Keep VITE_UNIPATHWAY_FACILITIES_WRITES_ENABLED=false until the write gate, existing physical-security and facilities gates, actual hosted RLS acceptance and operator approval are confirmed. The UI also requires the physical and register read flags and selected verified centre-director role. Enable the server write gate through the authorised operator and publish the approved build; disable both write switches if acceptance fails. Existing production settings are unchanged.

The interface retains an uncertain command and its request identifier only while the workspace remains mounted. Retry the same request, or reconcile it with an authorised operator before leaving. Reloading, signing out or leaving the workspace loses the in-memory draft; do not recreate an uncertain inspection without checking the register and command receipt. The private ledger stores the validated request payload for exact comparison; establish a reviewed retention/access policy. Do not record personal identifiers or provider credentials. A recorded observation does not certify the equipment, premises or fire-safety compliance. No hosted data, hardware, gates or credentials were changed by these commits.

## Maintenance review queue

The existing verified snapshot now drives a read-only, prioritised maintenance review queue. It distinguishes the latest recorded defect, due or overdue inspections, dates within seven days, missing next dates and missing/unverified inspection evidence. Categories overlap; the totals are not safety scores. A completed inspection without a next date is explicitly unscheduled rather than reverting to its original due date. A satisfactory record is not certification, and the queue does not assert a repair is complete.

The queue requires the existing physical-security and facilities read gates. Only a verified centre director with the separate write switch and server gate can record a new observation. No notification delivery, maintenance assignment, calendar sync, repair-order persistence or equipment activation is provided by this change. Keep actual maintenance and emergency procedures in place. Verify the hosted register and role isolation before relying on the queue.

## Inspection calendar reminders

An authorised centre director with the facilities write browser switch can export upcoming verified review dates within a 7, 30 or 90 day horizon. Calendar alarms can be requested for one or seven days before the date. The file contains generic all-day events grouped by date, not asset identifiers, centre IDs, locations, findings, staff details or inspection notes. The on-screen count is not included in the export. Past and unscheduled dates remain in the review queue.

Manual import and the receiving calendar's notification settings determine whether reminders are delivered. Repeat exports have new event IDs and can create duplicates. Remove previous imported events when dates change. No background scheduler, automatic email, WhatsApp delivery, inspection booking or live provider connection is activated.
