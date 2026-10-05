# Edge Function Audit — Phase 2

High-risk classes:
- money: create-education-payment, webhook-stripe
- identity: nadra-identity-connector
- provisioning: microsoft-education-provision, lab-provision
- academic: ai-assessment-agent, ai-grading-assistant, marking-consistency-agent, academic-integrity-agent
- intelligence: Omniqora event/index/retrieve/calculators

Required controls for every high-risk function: authentication unless cryptographically verified webhook; tenant authorization; server-side authoritative object lookup; bounded schema; rate/abuse control; no privileged secrets in response/client; auditable mutation; idempotency for retried provider actions; minimum sensitive logging.

Current priority findings:
- Stripe webhook: signature + replay check present; add durable provider-event idempotency and authoritative tenant/order relationship validation.
- create-education-payment: authenticated and RLS-backed, but real provider checkout adapters are intentionally absent.
- Microsoft: authenticated/config gate only; Graph mutation not implemented.
- NADRA: consent + credential gate + minimal metadata; live provider probe pending.
- lab-provision: authenticated/config gate; provider adapters pending.
