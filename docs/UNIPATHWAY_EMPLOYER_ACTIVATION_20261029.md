# UniPathway employer activation — 29 October 2026

## Hosted deployment

Correct project: `2c97a03a-f146-4ff5-a22b-3765cf2f538f`, backend `sthrhcmjypwuorlbscfw`. Preflight confirmed all four employer tables and five foundation helpers absent, the existing role/tenant helpers present, and exactly one UniPathway tenant. No existing employer records or definitions were replaced.

The selected foundation `20261018230000_unipathway_employer_opportunities.sql` and privilege hardening `20261029212200_employer_explicit_privileges.sql` were rehearsed together in isolated PGlite fixtures and in a hosted transaction ending with ROLLBACK. A separate hosted read confirmed zero employer tables remained. The identical bundle was then committed, with a schema-cache reload notification.

Dry-run SQL SHA-256: `4b6f6fe20ff36888e7a543a2fd97757169d1ec6931b0fc356f4da0df97a11d72`. Commit execution changed only its final ROLLBACK to COMMIT.

Independent post-deployment verification found four tables with RLS enabled, no anonymous SELECT/TRUNCATE grants, and no authenticated DELETE/TRUNCATE/TRIGGER grants. An authenticated database probe as the supplied employer account successfully read memberships, joined organisations, opportunities and applications. All returned zero records: no verified employer membership is currently connected to that test account. No employers were falsely approved and no vacancies or applications were seeded.

Only these two actually applied versions were recorded in `supabase_migrations.schema_migrations` after verification, using version/name receipts with no statement array. This does not reconcile other historical migrations. Do not run a blanket production migration push.

## Reproduction and scope

`node scripts/activation/prepare-unipathway-employers.mjs` prints a transaction ending in ROLLBACK; `--commit` prints a committing transaction. It never connects to a database. It refuses existing/partial installations rather than overwriting definitions. The preparation script does not write migration-ledger receipts; an operator must reconcile and record successful selected deployments separately.

`node scripts/test-unipathway-employers-db.mjs` checks the exact bundle with two tenants and distinct actors, including publication approval, student consent, private employer data, ownership protection, withdrawal, cross-tenant denial, inherited privilege removal, rollback and replay refusal (73 assertions).

The portal now resets its state when account, centre or role changes and ignores superseded read responses. Regression tests cover account switching, late refresh failure and retry without presenting a failed query as pending approval.

This verifies database deployment and source behaviour, not a completed signed-in browser journey or frontend publication. Supervised placement tracking is a separate migration and is not deployed here. AWS lab reconciliation, lesson whiteboards, actual employer verification and full 17-role browser acceptance remain open. No paid infrastructure or external messages were started.

Rollback is automatic before commit. After commit, preserve any new employer records; use a reviewed forward fix. Do not drop the new tables as a routine rollback.
