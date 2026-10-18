# UniPathway backend diagnostic and safe staging path (read-only findings)

## Verified facts (checked this session, read-only)
- Project config and the app's environment both point at backend ref `sthrhcmjypwuorlbscfw`. The Lovable-managed backend for this project is that same ref. One instance serves both preview and the published site, so there is no separate staging database inside this project.
- Backend health: database and auth are reachable and healthy right now. The earlier "pooler unavailable" error came from a backend that was asleep or waking; it is up now.
- Repository has 139 migration files; latest is `20261017095500_stemcoach_centre_links.sql`.
- Live migration history table records only 4 entries (latest `20260929181522`). Most repo migrations are therefore not recorded in history (some may have been applied by other means; history alone cannot confirm).
- Live public schema has zero tables whose names contain ielts, speaking, commission or international.
- Live storage buckets: avatars, submissions, resources, kyc-documents. No private speaking bucket.
- Repository migrations matching those topics: only commission/progression/partnership files (e.g. `20260927130000_careers_internships_global_progression`, `20261013170000_global_education_partnerships`, `20261015130000_partnership_workflow_hardening`). No IELTS Academy or private speaking storage migration exists in this repo. PR #31 migrations are not present in this checkout.

## Cannot access / not verified
- PR #31 contents (not in this branch); GitHub PR state.
- The external `query_database` connector's own logs; its 504 is outside this workspace.
- Any separate staging project; none is linked here.

## Likely cause of the 504
The external connector times out at its gateway while the managed database is idle/waking (same pattern as the 544 pooler timeout seen at session start). Because health is now green, a retry should succeed. If it still 504s, the connector is likely targeting a different ref or a paused project; confirm its target ref equals `sthrhcmjypwuorlbscfw` and treat that as production.

## Safe path for PR #31
1. Do not apply PR #31 to `sthrhcmjypwuorlbscfw`; it is production.
2. Create an independent staging backend (separate Supabase project or a Lovable draft/remix with its own isolated backend) and record its ref; confirm it differs from the production ref before any command.
3. Reconcile history first: on staging, replay the full migration chain (`scripts/verify-migrations.sh`, i.e. `supabase db reset` locally), because production history has only 4 rows and drift is likely.
4. Check out PR #31, then `supabase link --project-ref <STAGING_REF>`, `supabase db push --dry-run`, review the list, then `supabase db push`.
5. Run `npm run test:db`, `npm test`, Playwright role journeys and private storage policy checks against staging.
6. Production only after a verified backup and explicit approval; first run a read-only schema diff against production to decide which historic migrations are already applied versus missing.

## Not doing
No code edits, DDL/DML, migrations, publish, remix, integrations or credential exposure.
