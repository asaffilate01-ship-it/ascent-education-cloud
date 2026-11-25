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

No physical asset or inspection data is seeded. No equipment compliance or live installation status is implied. Dedicated facilities-manager and superadmin access requires a separately reviewed centre delegation model. The current temporary inspection planner is not connected to this schema yet.
