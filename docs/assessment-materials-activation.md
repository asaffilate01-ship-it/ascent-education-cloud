# Assessment and protected resources activation

The existing marking and resource screens depended on tables absent from the live legacy database. This release installs the independent assessment workflow, appeals, private coursework uploads, retry-safe submission RPC and consent-checked parent results. It also activates course material metadata and private storage access without requiring a live Teams provider.

Assessment activation takes a lock and refuses cutover if legacy submissions or gradebook entries exist. The live preflight found zero of each. Legacy direct submission marking remains archived/read-only for the permitted audit roles. New attempts, allocations, human marks, IQA decisions, released results and appeals are changed through authorised RPCs. Only draft brief/rubric authoring permits direct client writes. Parents receive a narrow released-results projection after verification and learner permission; unreleased marks and private evidence remain excluded.

Course resources retain draft/publication rules and assigned-module permissions. Publication requires an actual uploaded object. Identity/path reassignment and object overwrites are blocked. Registered objects cannot be deleted by the client. Restrictive bucket policies prevent older permissive storage policies from widening access. Signed URLs already delivered remain valid until expiry; this release does not claim remote deletion of downloaded files.

## Validation and deployment

- 63 independent marking, IQA, appeal and tenant-isolation checks passed.
- The actual new activation migrations passed a legacy-shaped PostgreSQL fixture: 15 parent results checks, 21 coursework/storage/retry checks and 7 protected-resource checks.
- Full synthetic 192-migration schema rehearsal passed, with existing provider-extension deferrals.
- Application TypeScript passed. Existing frontend bundles were not changed by this release.
- Both migrations passed live rollback rehearsal and RLS inspection (zero new assessment/resource tables without RLS), then were applied with migration-ledger records.
- No student work, grades, provider accounts or real users were invented. Real role-account/browser and hosted storage transport acceptance remain required.

This does not activate the modern Teams classroom schema or external recording/lab providers. It also does not implement inline document annotation, complete language/tech lab provisioning, SCORM/LTI or offline course packs. See UNIPATHWAY_CONNECTION_CHECKLIST.md for the provider, operational and remaining software work, including the distinction between built adapters and placeholder routes.
