# UniPathway release fixes and connection handover — 15 October 2026

## Implemented in PR #20

- Fixed invalid SQL dollar quoting that prevented the original partnership migration from replaying.
- Current signed agreement evidence and active/contracted relationship gate pathway publication. Student reads recheck these conditions, so suspension, termination and contract expiry immediately hide routes.
- Added staff agreement registration, activation, termination, pathway evidence review/publication and withdrawal controls. Signed document references point to the institution's controlled document system; this release does not add file upload or verify signatures automatically.
- Staff can create a canonical international university application and referral atomically for a verified route and a student in the same centre. Repeated requests reuse the pending referral. University organisation records are not falsely marked verified.
- Referrals show the named receiving organisation. Only the student can give or withdraw consent. Cross-tenant and mismatched partner/route/application links are refused. Manual submission requires a provider-issued reference; it does not send an application to a provider.
- Submission, offer, enrolment and withdrawal update the canonical student application. Audit records retain actor, entity and state transitions.
- Local outbox processing now inserts actual education events transactionally and idempotently. It does not falsely mark them delivered remotely.
- Added a tenant-scoped Factory sender using the **existing** Omniqora HTTP event contract; leased batches, retries/backoff, stable idempotency keys, receipt validation and server-only secrets. A remote receipt is not evidence that an AI job finished.
- Replaced query-ignoring knowledge lookup with PostgreSQL full-text search over approved title/qualification metadata under caller RLS. This is not vector search or full-document RAG.
- Wired previously unreachable education intelligence and readiness pages behind director/landlord guards, plus the student's international applications page. Added queue processing controls and honest unconfigured readiness states.
- Removed authenticated Supabase response caching and purge the legacy cache on service-worker activation.
- Repaired the npm lockfile. Generated missing education/partner table types from replayed SQL rather than weakening the client types. CI now runs clean installation, typecheck and database integration checks.

## Verification and scope

- `npm run test:db`: 36 PostgreSQL/PGlite integration checks, including executing the original partnerships SQL plus new migrations. Covers permissions, consent forgery, partner suspension/expiry, application creation/status sync, metadata search, idempotency and delivery leases.
- `npm test`: 32 tests, including component consent/error states and Factory request/receipt behaviour.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`, `npm run build`, `git diff --check`.
- Existing lint warnings and a large-bundle warning remain; no lint errors.
- The DB harness replays the relevant education and partnership migrations against a minimal fixture with auth/RLS helpers and base tables. It is **not** a replay of all 131+ historic migrations against Supabase Auth/Storage, nor a deployed browser journey test.
- No production database credentials, migrations, provider calls or deployments were used. No live health or centre/qualification approvals are asserted.

## Factory configuration — exact existing contract

Source verified in `asaffilate01-ship-it/seamless-comms-suite` at `08b47a3`, files:
`src/routes/api.integrations.events.ts`, `src/modules/ecosystem/bridge-core.ts`, `bridge.server.ts`.

`POST /api/integrations/events` expects a scoped bearer credential, millisecond `X-Event-Timestamp`, stable `Idempotency-Key` and JSON:

```json
{"title":"UniPathway lab.completed","input":"{\"tenantId\":\"SOURCE_TENANT_UUID\",\"scopeId\":\"SOURCE_TENANT_UUID\",\"eventType\":\"lab.completed\",\"recordId\":\"SOURCE_RECORD_UUID\"}"}
```

No names, student IDs, coursework, grades, free-text event payload or other student content is exported. Record IDs are opaque notification references. Approved context retrieval remains a separate integration.

Configure server-side Supabase Edge secrets (never `VITE_` variables):

```json
OMNIQORA_CONNECTIONS_JSON=[{"tenantId":"SOURCE_TENANT_UUID","origin":"https://YOUR_DEPLOYED_FACTORY_HOST","tokenEnv":"OMNIQORA_BRIDGE_TOKEN_CENTRE_A","enabled":true}]
```

Set `OMNIQORA_BRIDGE_TOKEN_CENTRE_A` to the operator-issued secret of at least 32 characters. The dispatcher also needs Supabase's server URL, anon key and service-role key. It authorises the caller as a director/superadmin in the requested tenant before using service permissions.

On Omniqora, register the matching enabled `OMNIQORA_BRIDGES_JSON` binding, with `protocol: bearer`, `contracts: [event]`, source `externalTenant` and `allowedScopes` equal to the source tenant UUID, and a separately entitled Factory tenant/project/service user. **The current ecosystem catalogue uses product key `unipathways` (plural)**; use that existing key until a coordinated alias migration is agreed. `unipathway` is the source product's existing local registration key. Do not silently equate Factory and source tenant IDs.

Set the binding's `secretEnv` using Omniqora's required `OQ_BRIDGE_...` name to the same secret; set a valid expiry, permitted profile and daily limit. Factory entitlement, active membership and transformation runtime configuration are also required. An HTTP 202 receipt records acceptance only.

Deploy `omniqora-factory-dispatch` and `omniqora-education-retrieve` after migration validation. A director can process local signals and deliver batches from `/director/education-intelligence`; landlord equivalents are available. Delivery is manually triggered in this release. There is no automatic scheduler configured.

Failed delivery uses exponential backoff; processing leases expire after two minutes. At ten attempts, investigate configuration and evidence before an operator resets attempts with service permissions. Do not generate new IDs to evade idempotency. A timeout after remote acceptance is safely retried using the original key.

## Remaining launch gates

1. Run the complete migration history and generated-type comparison in a Supabase staging instance, then role-specific browser journeys and storage checks. Take and verify a production backup before release.
2. Configure and test the deployed Factory binding and credentials. Central API source is verified; live activation and AI runtime processing are not.
3. Microsoft Entra/Graph institutional setup, licenses and admin consent; the existing provisioning endpoint remains a scaffold and is not a working Graph provisioning connector.
4. Select/enable institutional payment rails and complete real checkout/webhook/reconciliation integration. Existing provider-checkout endpoint remains a scaffold. No paid or external calls were made.
5. Lab provisioning and NADRA institutional approval/API packs remain external integration work. Do not treat configured records as connected providers.
6. Signed partner contracts, approved admission routes and provider-issued API access. This release supports audited manual submissions; no GEDU/ApplyBoard/awarding-body API or automated commission invoicing is claimed.
7. Course content, assessment/IQA evidence, awarding-body/centre approvals, backup restoration and live teaching validation.
8. Full document indexing/vector RAG, scheduled queue delivery, complete education-source event coverage and scoped model gateway execution are not completed by metadata search/event transport.

PR remains a draft until staging migration and role journey gates are satisfied. No merge or production deployment has been performed by this change.
