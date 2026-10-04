# Backup, Restore & Incident Runbook

## Database
Enable production managed backups/PITR appropriate to the selected Supabase plan. Record retention and recovery objectives. A backup is not considered verified until a restore is successfully performed into an isolated environment and application smoke tests pass.

## Restore drill
1. Declare drill and capture source backup timestamp.
2. Restore to isolated non-production project/database.
3. Run schema/version checks.
4. Verify tenant isolation and representative student/course/assessment/payment records.
5. Run smoke/E2E tests against the restored environment.
6. Record elapsed recovery time, missing data window and evidence.
7. Destroy/sanitise drill environment according to policy.

## Incidents
Severity, owner, timeline, affected tenants/data, containment, recovery, notification decision, root cause and follow-up actions must be recorded. Security incidents involving identity, assessment, payment or CCTV evidence follow the relevant privacy/regulatory escalation process.

## Monitoring minimum
Application errors, Edge Function failures, auth anomalies, database saturation, queue/outbox failures, payment webhook failures, Microsoft sync failures, lab provisioning failures, CCTV/access health where integrated, and backup health.

Never mark the Production Readiness backup/restore gate PASS merely because backups are enabled; attach restore-drill evidence.
