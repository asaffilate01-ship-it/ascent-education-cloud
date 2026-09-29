# Edge Function Security Checklist

Every privileged Edge Function must satisfy these controls before production:
- authenticate caller unless explicitly public by design
- derive/verify tenant server-side; never trust arbitrary tenant_id from request body
- authorize role/action before service-role writes
- validate request schema, identifiers, file size/type and bounded arrays
- rate limit abuse-sensitive routes
- keep service-role, Microsoft, payment, NADRA and AI secrets server-only
- avoid returning provider secrets, internal stack traces or unrelated records
- log privileged mutations/security failures without logging credentials or unnecessary sensitive content
- verify payment/provider webhooks cryptographically and make handlers idempotent
- use least-privilege storage paths and signed URLs for private evidence
- CORS allow-list production origins for authenticated browser endpoints where practical

High priority audit set: create-education-payment, webhook-stripe, microsoft-education-provision, corporate-bulk-enrol, invite-staff, nadra-identity-connector, ai-assessment-agent, ai-grading-assistant, marking-consistency-agent, build-lesson-pack, generate-certificate.
