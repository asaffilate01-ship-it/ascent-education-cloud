# Public enquiry activation and tenant safety — 26 November 2026

The legacy contact handler now rejects malformed input and missing, inactive or unresolvable tenants before service-role writes. Public responses do not expose database error text. This is not equivalent to durable anti-abuse enforcement. Its in-process IP limit is not shared across edge instances.

The secure UniPathway contact handler continues to require Turnstile and a durable quota. Deploy and verify both handlers before switching traffic. Confirm the actual UniPathway project, active tenant, quota migration, Turnstile site/secret keys, allowed hostnames, request action and quota pepper (server secrets only). Test success, expiry, invalid tokens, duplicate/repeated requests, unknown/inactive tenants, failure recovery and CRM handoff. Do not collect identity or bank documents in a general enquiry.

Once verified, coordinate these two settings:
- Browser publishing environment: VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED=true
- Legacy contact edge function server environment: UNIPATHWAY_REQUIRE_SECURE_CONTACT=true

The server-side switch rejects direct legacy contact requests targeting UniPathway, preventing a browser-flag-only bypass. Other active tenants keep the existing compatibility route until their own protections are approved. An old cached client should prompt a refresh/support contact if the legacy request is rejected. Do not set either flag or deploy live credentials without the hosted acceptance evidence. No production secrets belong in source control.

Verify admission staff see only centre-scoped leads and the consultation queue recognises the submitted preferences. This is an enquiry, not an appointment confirmation. A future transactional admission RPC should recheck active tenant status at write time and make idempotent lead creation and delivery reconciliation explicit. A live deployment, security configuration or verified tenant status has not been established by these repository tests.
