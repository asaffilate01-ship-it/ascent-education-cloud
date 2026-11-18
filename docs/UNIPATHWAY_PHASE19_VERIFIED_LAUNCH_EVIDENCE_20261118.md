# UniPathway Phase 19 — fail-closed launch evidence and review provenance

**Prepared:** 18 November 2026. **Scope:** source-only launch-readiness evidence verification, UI recovery and timestamp confidence.

## Finding
The Production Readiness UI uses centre-scoped PostgREST pagination and authorised review RPCs. Until now the UI trusted the returned arrays without independently checking each integration's and launch check's centre, identity, revision or uniqueness. A malformed or unexpected backend response could present a cross-centre record or duplicated status alongside a misleading launch summary. Evidence/health functions also accepted browser-local timestamps.

## Change
- Verify the *complete* integration and review-check arrays against the active centre, record identity, unique keys, valid statuses and revision types before displaying launch status, provider health or staff review controls. A single inconsistent row blocks the whole snapshot with an explicit retry error.
- Clear prior results whenever a reload starts or fails; treat thrown reads as failures rather than leaving a loading state or presenting partially refreshed data. Prevent superseded requests from reviving previous account/role context.
- Verify review history belongs to the same centre and check, has unique review identities and revisions, and uses explicit timezone-qualified timestamps before showing it in the audit.
- Apply the existing strict academic-instant validator to integration health checks and reviewed evidence deadlines. Ambiguous or impossible dates never turn into approved or current evidence.
- Add source-level and React regressions for cross-centre records, duplicate keys/revisions, malformed timestamps and safe unavailable states.

## Boundaries and remaining P0
This is an additional client integrity check; server RLS, RPC authorisation, real two-centre JWT/Storage acceptance, migration parity, approved provider integrations, payment reconciliation and the backup/restore drill remain authoritative and unverified for production. No schema, ACL, grade, enrolment or provider configurations changed.

Release requires exact-head lint, typecheck, unit, DB/Edge, browser, manifest, native build and design workflow results before merging. Do not claim deployment or centre acceptance from passing synthetic CI.
