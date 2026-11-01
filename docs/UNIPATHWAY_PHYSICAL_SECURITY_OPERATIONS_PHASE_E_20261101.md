# UniPathway — physical centre security Phase E, source and staged activation
**Date:** 1 November 2026. **Repo:** `asaffilate01-ship-it/ascent-education-cloud`.
**Live status:** Source-only. The accessible Supabase connector lists **DISHBEE**, not UniPathway. Never run this SQL on Dishbee.

## Workspaces and permissions
- `/security/operations` — centre command overview: recorded occupancy, device and camera health freshness, active muster alerts; no playback/stream secrets.
- `/security/centre` — recorded gate events and occupancy (no credential hashes or raw identity evidence).
- `/security/visitors` — minimum-PII visitor pass list. Read-only until the visitor-write feature flag and server-side receipts are verified. A trained Security Officer records an in-person ID-check attestation; no government ID numbers collected in the UI. Registration/checkout each create an access event and atomically update occupancy.
- `/security/muster` — strictly read-only active muster accountability. Multiple active incidents fail closed and no screen replaces physical roll-call.
- `/security` — existing separate CCTV gateway workflow. No media access changed in this phase.

Accessible only under **currently active** `security_officer` or `centre_director` profile + matching centre. A global `superadmin` requires a separate, explicit tenant selection facility before opening private centre data. Browser membership checks do **not** confer database rights. No other role can use these routes. Security officers read a **server-side allowlisted JSON projection**, not the raw public CCTV/device tables, to protect stream references, internal endpoints and event metadata.

## Activation plan and rollback
1. Compare real UniPathway hosted migration receipts, app_role enum (including `security_officer`), role/profile/centre constraints and all seven referenced tables. Do not replay old migrations.
2. Back up verified UniPathway staging and review `scripts/activation/unipathway-physical-security-operations-forward.sql` manually. This file is deliberately NOT in the historical migrations directory. Test on two independent staging centres with real signed-in JWTs and RLS; run synthetic PGlite tests first.
3. The SQL patch creates private `unipathway_security.activation_gate`, initially `physical_reads_enabled=false` and `visitor_writes_enabled=false`. Even authorised staff cannot use the read RPC or check in a visitor until a privileged operator deliberately activates the relevant backend flag. The client flags are an additional UI gate, not the source of authorisation.
4. Test cross-centre reads, revoked role, global owner lacking centre context, direct PostgREST SELECT/INSERT/UPDATE denial, repeated idempotency request IDs, conflicting IDs, accidental bulk deletes, invalid ID attestation, failed occupancy update, and permissions of the public `SECURITY INVOKER` wrappers and private SECURITY DEFINER helper. Confirm auditing and full backup/restore.
5. After reviewed UniPathway staging SQL deployment and real acceptance, use a privileged, recorded change to set `unipathway_security.activation_gate.physical_reads_enabled=true`. Then set `VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED=true` in UniPathway staging. Leave `VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED` **off** until the check-in/checkout RPCs are applied, trained reception staff are assigned and their real centre role is confirmed.
6. Enable visitor writes only after a separate privileged, recorded change to set `unipathway_security.activation_gate.visitor_writes_enabled=true`, and after exact-head CI, two-centre staging acceptance, counter-operations test and safeguarding/privacy sign-off. Review incident escalation, offline continuity and retention before production.
7. For emergency shutdown, set the matching backend activation flag(s) to false as well as both browser flags to stop UI queries/actions. To roll back database privileges, revoke the new named security-officer policies and wrappers as part of a reviewed rollback plan; **do not drop historical security tables or destroy visitor history**.

## Invariants
- No client-supplied permission flags, centre ID or pass code can grant server access; only `auth.uid()`, active tenant/profile and centre-scoped `user_roles` authorize a visitor action. A suspended centre fails closed.
- Public wrappers use SECURITY INVOKER; private functions check database membership again, run in a restricted search_path and emit receipt `id`, `tenant_id`, `status`, `pass_number`. A request UUID prevents double check-in/out after a network retry.
- Raw exposed tables retain their existing director policies; no new security-officer raw-table SELECT RLS is added. Authenticated security officers use a private definer projection with server-defined fields, strict centre validation and pagination, backed by source ACL verification. The client rejects mixed-centre/truncated results.
- Do not use these recorded counts to assert that a building is physically safe; emergency and occupancy devices need independent health and roll-call validation.
- This phase makes no claim of working external CCTV, Microsoft, AWS, live fire panels, access readers or authorised operating personnel.
