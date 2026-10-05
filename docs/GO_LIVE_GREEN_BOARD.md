# Go-Live Green Conversion Board

## Green now (repository evidence)
- Production CI: lint/test/build passes at latest audited PR head.
- Role/workflow security contracts: automated tests exist.
- Omniqora safety contracts: automated tests exist.
- Public/protected navigation smoke: implemented.
- Backup/incident runbook: documented.
- Release evidence workflow: implemented.
- Integration-health/readiness dashboards: implemented.

## Yellow -> green by code/test execution
- Clean migration replay: run local/staging reset and retain evidence.
- Generated Supabase types: regenerate after replay and compile.
- RLS/IDOR: run real two-tenant Supabase integration suite; unit attack matrix is only preflight.
- Private storage: create real signed/private bucket access tests.
- Authenticated E2E: seed staging identities and execute academic/finance journeys.
- Edge Functions: finish full register and direct authorization tests.
- Load: execute k6 against production-like staging and retain results.
- Native: generate iOS/Android projects and device-test after dependency/lockfile gate.

## External yellow/red -> green only with real activation
- Microsoft Graph: tenant, admin consent, licence SKU and functional provisioning.
- NADRA: authorised institutional credentials OR formally approved manual KYC fallback.
- Payments: contracted providers, production keys, signed webhooks and reconciliation.
- Labs: at least one provider adapter/account tested end-to-end.
- STEMCoach: SSO/API/progress sync.
- Central Omniqora Factory: endpoint/token and functional product registration/event export.
- Integrity provider: production Turnitin/chosen provider.

## Operational red/yellow -> green only with evidence
- Awarding-body approvals/status for marketed routes.
- Complete approved launch course packs.
- Staff/marker/IQA recruitment, vetting and capacity.
- Placement partner agreements.
- Safeguarding/privacy/CCTV policies.
- Physical access/CCTV/NVR commissioning and emergency drill.
- Pilot cohort sign-off and final launch decision.

No external/operational item may be painted green by a UI flag alone.
