# Launch evidence and admissions usability

26 October 2026. This phase does not complete all external connections or remaining learning features.

The live database lacked the production readiness registry. The reviewed registry, catalogue, tenant seed and audited review migrations were applied after a full 199-migration synthetic schema rehearsal, isolated RLS/concurrency checks and an exact live transaction rollback rehearsal. All 42 seeded checks remain pending. No provider or learner workflow is marked passed by this deployment.

Leadership can read only its own tenant's records. Anonymous reads and direct authenticated writes are revoked; reviews use the existing revision-checked RPC and append audit history. Fourteen additional checks cover the outstanding work requested. New tenants receive the baseline and additional checks. Existing reviews are not overwritten. Browser launch health now rejects timestamps older than 24 hours, future timestamps and malformed dates. Health observations must still be supplied by verified server operations; this phase adds no polling worker.

The connection guide now describes current implementation boundaries across all 14 areas and is collapsed beneath the actual evidence. The admissions page prioritises enrolment review, collapses specialist service activation and statistics, defaults to the desktop list and provides mobile application cards with next-step guidance. Cards do not perform missing workflow operations. Academic enrolment still uses the existing guarded transactional RPC.

## Verification

- 17 isolated PostgreSQL checks: role/tenant isolation, direct-write restrictions, anonymous access, required evidence, review revision conflicts and audit history.
- 16 readiness unit/UI tests and 10 admissions workflow UI tests.
- Full existing database test suite; 199-migration synthetic schema rehearsal with provider-owned extensions deferred.
- TypeScript and production build.
- Mobile 390px and desktop 1440px browser checks with synthetic accounts/backend: admissions search, card/table layout, readiness failure-closed state and no horizontal overflow.
- Live registry tables have RLS, authenticated SELECT, no anonymous SELECT and no authenticated UPDATE.

## Still incomplete

Real account/role acceptance; complete admissions journey; Omniqora endpoint/model/budgets; Microsoft consent/licences, account reconciliation, hosted workers, recurring meetings and recordings; live language-room audio; cloud provisioning; merchant checkout/reconciliation/refunds; hosted institutional email; PDF/DOCX annotation and shared approved feedback; working SCORM/LTI, reusable approved curriculum and controlled publishing; offline cold startup/media; real guardian/sponsor workflows; approved NADRA and chosen CCTV integration; actual public contact/fees/intakes and centre approval evidence.

Do not place credentials in review notes. Provider activation needs the corresponding server-side secret configuration, authorised accounts/contracts, worker hosting and real workflow verification. Publication is distinct from merging; a pending deploy is not a verified release.
