# Staging Security Probe Setup

The workflow is intentionally disabled until a disposable/non-production Supabase environment is prepared.

Repository variable:
- STAGING_SECURITY_PROBES_ENABLED=true

Secrets:
- STAGING_SUPABASE_URL
- STAGING_SUPABASE_ANON_KEY
- STAGING_TENANT_A_STUDENT_JWT
- STAGING_TENANT_B_STUDENT_JWT

Variables:
- STAGING_TENANT_A_OWN_PROFILE_FILTER
- STAGING_TENANT_B_PROFILE_FILTER

Never use production student JWTs. Seed synthetic identities only. Extend the script to assert empty forbidden query bodies, direct RPC denial, storage denial, and all role combinations. Retain artifacts as readiness evidence.
