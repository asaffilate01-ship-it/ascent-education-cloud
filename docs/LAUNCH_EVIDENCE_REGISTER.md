# Launch Evidence Register

This register explains what evidence is sufficient to move a Production Readiness item from pending/not-configured.

- CI main green: successful workflow for the exact main SHA.
- Migration replay: clean reset/replay from empty staging DB plus generated types.
- RLS: authenticated positive and cross-tenant/IDOR negative tests against deployed staging.
- Storage: private bucket policy tests and expired signed URL negative tests.
- Edge Functions: auth/authz/service-role review plus representative direct-call tests.
- E2E personas: successful browser journeys for student, lecturer, assessor, IQA, admissions, finance, employer, parent, director and landlord.
- Backup: successful isolated restore drill and smoke test, not merely backup enabled.
- Load: recorded production-like run at the agreed learner/event scale with latency/error/DB metrics.
- Microsoft: real Entra/Graph tenant, account provisioning, Teams class join/attendance/artifact test.
- Payments: sandbox/production-like webhook idempotency, success/failure/refund/reconciliation.
- STEMCoach: signed SSO, entitlement mapping, expiry/revocation and progress round-trip.
- Academic: exact launch-course approval evidence and complete versioned Student/Teacher/Assessment/QA packs.
- Pilot: controlled cohort completes the agreed end-to-end journey with P0/P1 defects closed.

Never set PASS from a screenshot of a UI alone.
