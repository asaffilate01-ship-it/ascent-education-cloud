# Facilities follow-up register — 27 November 2026

This is a fourth, separately disabled forward patch, not an automatically applied migration. It requires the physical-security and three facilities register patches. Apply only after reviewing the actual predecessor schema and authorised target, backup and restore plan. Never apply to Dishbee.

## Scope

Directors can record follow-up work linked to an existing centre-specific defect or unverified inspection, select a responsible team and set a target date. A security officer may read the projected register. Resolution is a separate immutable record with factual evidence; neither an action nor a resolution changes the original inspection outcome or certifies safety. Team names are planning labels, not staff accounts or notifications.

The private tables are RLS-enabled and have no direct browser grants. Public security-invoker wrappers call a non-exposed implementation checking authenticated actor, active tenant, centre roles and the server gates. Exact request replay is accepted only for the same actor and payload; one open follow-up per inspection and one recorded resolution per action are enforced under centre serialization. The snapshot is bounded at 500 actions; approve reporting and retention before capacity is reached. Do not remove records to create space.

## Acceptance and activation

- Rehearse the fourth patch in the isolated database with the actual predecessor schema. The existing physical-security PGlite suite exercises disabled gates, anonymous and cross-centre denial, valid writes, duplicate and changed-payload replay, private-table denial, write-gate removal, immutable evidence and suspended-centre access.
- Test hosted reads for authorised security officers and centre directors; test writes for an authorised director, a foreign tenant, an unrelated role, a revoked membership and a suspended tenant. Review Data API exposure and database advisors.
- Keep VITE_UNIPATHWAY_FACILITIES_FOLLOWUPS_ENABLED=false until the separate follow-up server gate and hosted acceptance are approved. Reads additionally require the existing physical and register read switches. Recording also requires the existing facilities write browser switch and server write gate.
- On an uncertain result, retain the exact command until reconciled. The in-memory request is lost on page exit, so do not recreate an uncertain action without checking its recorded request and register. Review access and retention for the private ledger.
- Verify actual maintenance procedures, responsible staff, contractor reports and independent inspections. Do not enter identifiers, camera credentials or sensitive documents in follow-up text.

No automatic emails, calendar reminders, work-order dispatch, physical equipment changes, certification or live activation are provided. No hosted migration or production record has been created.
