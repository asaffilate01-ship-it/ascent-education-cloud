# Near-100% launch definition

Software can approach code-complete, but production is not 100% until external credentials, real infrastructure and operational evidence exist.

## Code-complete gates
- green CI: deterministic install, lint, unit tests, production build
- Playwright desktop/mobile smoke and authenticated critical journeys
- clean migration replay and generated Supabase types
- RLS/storage/Edge Function authorization tests
- polished role navigation and no dead routes
- security/access/CCTV/muster workflows wired to dedicated roles
- backup/restore scripts/runbook, monitoring and incident logging

## External gates
- Microsoft Education tenant/domain/Graph/licensing
- payment acquiring/mobile-wallet/bank credentials and signed webhooks
- NADRA approved institutional verification access, or documented manual KYC fallback
- production email/SMS
- physical access-control/NVR/VMS hardware vendor integration
- Apple/Google developer accounts, signing and store review for native apps

## Operational gates
- launch course content and awarding-body approval evidence
- staff recruited/vetted/trained; marker/IQA capacity
- safeguarding/privacy/CCTV/retention policies
- disaster/evacuation drill and security SOP
- 3,000-student data/load test and pilot cohort
