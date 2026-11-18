# Phase 17 — Privileged function remediation: review before production change

**Status:** draft for isolated staging/security approval. **DO NOT auto-run in a live database.** Collected by read-only SQL inspection on 18 November 2026.

## Confirmed metadata
- `public.seed_unipathway_launch_gates(p_tenant uuid)` is `SECURITY DEFINER`, callable with the `anon` role, and accepts an arbitrary caller-supplied tenant UUID.
- Its SQL inserts default `not_configured` production integrations and `pending` readiness checks. The function itself has no explicit caller-identity or centre-authorisation condition.
- The only other routine that invokes the seed function in the observed public function definitions is `initialise_unipathway_launch_gates()`, a trigger routine attached to `public.tenants` after insertion.
- `authenticated` is already reported **not** to have direct EXECUTE on the seed routine; `anon` and `service_role` are reported to have it.
- This presents a credible integrity/abuse boundary. We have not sent a live RPC to prove exploitability, to avoid production mutations.

## Review and staging prerequisites
1. Confirm the actual function owner, direct grants and `public.tenants` trigger definition; inspect Edge/worker caller inventory, including service-role operations. Record current `pg_get_functiondef` and a tested backup and rollback plan.
2. Run negative RPC tests as an anonymous client and as a regular signed-in student using a **disposable isolated two-tenant staging database**. Confirm both cannot create readiness records by calling the routine directly. Do not send such tests to production.
3. Confirm authorised tenant creation still populates default launch gates via the trigger and service-role paths; test idempotency on a repeated authorised seed.
4. Only then apply the following minimal grant change to the verified schema. Don't replay stale migrations or replace functions wholesale.

### Proposed reviewed change (staging first)

```sql
begin;
revoke execute on function public.seed_unipathway_launch_gates(uuid)
  from public, anon, authenticated;
grant execute on function public.seed_unipathway_launch_gates(uuid)
  to service_role;
commit;
```

This grant change is **not executed** by this Phase 17 source PR.

### Read-only post-change evidence query

```sql
select
  has_function_privilege('anon', 'public.seed_unipathway_launch_gates(uuid)', 'EXECUTE')
    as anon_can_execute,
  has_function_privilege('authenticated', 'public.seed_unipathway_launch_gates(uuid)', 'EXECUTE')
    as authenticated_can_execute,
  has_function_privilege('service_role', 'public.seed_unipathway_launch_gates(uuid)', 'EXECUTE')
    as service_role_can_execute;
```

Expected only after approved application: `false, false, true`. A successful grant check **does not** replace direct signed-in/anonymous role tests and a real authorised tenant-creation test.

### Privilege rollback (only if reviewed trigger/service operations fail)

```sql
begin;
grant execute on function public.seed_unipathway_launch_gates(uuid) to anon;
commit;
```

Rollback reopens the identified risk and therefore requires a documented incident exception. Retain the actual before/after grants in the change record rather than assuming the above one-line rollback recreates every pre-existing grant.

## Other callable definers: separate scope
- `public.get_user_tenant_id(_user_id uuid)` has an unscoped identifier argument and anonymous EXECUTE. Inspect current RLS/helper dependencies, necessary result minimisation and tenant enumeration risk before restricting a function that policies may rely on.
- `public.verify_certificate(_cert_number text)` returns learner names and award details to a public caller. Confirm whether this is intentional public verification, certificate number entropy, rate limits, revoked/corrected results and a minimum public return shape.
- Audit all 25 anonymously callable `SECURITY DEFINER` functions; check explicit search paths, service-role ownership, centre/active-role validation and per-function public API need. Do not blindly revoke every grant; some functions are intentionally public read-only helpers.
