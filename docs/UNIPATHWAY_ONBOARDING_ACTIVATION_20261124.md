# Controlled onboarding activation candidate

The inspected UniPathway cloud schema lacked the caller tenant helper and all four onboarding tables. This source-only bundle provides a narrow prerequisite bootstrap, the five existing migration files in order, and explicit role-membership hardening. It avoids replaying unrelated historical policy rewrites.

Generate for review from the validated commit:

```sh
node scripts/activation/build-unipathway-onboarding-forward.mjs --print-sql > /tmp/unipathway-onboarding-reviewed.sql
```

The script emits SQL only. It never connects to a database, executes SQL, alters the hosted migration ledger or activates providers. The transaction aborts on missing prerequisites, existing/partial onboarding tables or RPCs, or ledger entries for these five versions. It uses a transaction lock and bounded statement and lock timeouts. Historical migration files remain unchanged. If the current tenant helper already exists, independently verify its implementation before deployment.

The follow-up guards require actual centre role membership (or a global superadmin with matching profile centre), protect draft identity and server timestamp, restrict independent screening and competency reviews, and restrict registration writes to centre academic managers. Individual registrations do not change programme-based LMS access.

Before production: verify the exact project, backup/restore, current schema and ledger; review the generated SQL; rehearse the exact bundle; apply through the approved deployment process; reconcile the ledger through the supported operator process rather than fabricate migration records; verify actual role JWTs and normal frontend workflows. Passing synthetic CI is not proof of hosted acceptance or production activation.
