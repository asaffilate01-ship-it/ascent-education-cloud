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
