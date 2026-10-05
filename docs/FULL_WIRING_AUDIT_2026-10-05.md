# UniPathway / Omniqora Full Wiring Audit — 5 Oct 2026

## Executive state
PR #17 CI is green at the audited head. UniPathway is a mature multi-tenant education SaaS locally, with landlord/tenant UI and RLS. It now contains a local Omniqora Education contract/intelligence layer. It is NOT yet physically registered to a separate central Omniqora SaaS Factory because that repository/API is not accessible to this GitHub connection.

## Built and locally wired
- Tenant/landlord: tenants, onboarding, branding, page builder, domain settings, landlord dashboard, tenant public pages and tenant-aware RLS.
- Academic: unified course directory, Course Factory, OTHM/Qualifi/IAB/ACCA route fields, tuition, employer learning, vocational/partner delivery, teaching/scheduling, assignments, specialist marking/assessor/IQA architecture.
- Delivery: Teams/live-class data model and UI, whiteboards, lesson archive, residential weeks, placements, careers/progression, virtual labs, secure centre IT assets.
- AI: course builder, study assistant/tutor, assessment/grading assistance, academic integrity/plagiarism, marking consistency, predictive analytics and teaching scheduler.
- Omniqora local intelligence: product registration state, event contract/outbox, Student 360, Cohort 360, Course/criteria 360, School/Department/Institution intelligence, interventions, executive snapshots, permission-first knowledge index/retrieval boundary.
- Security: RLS/role contracts, workflow/security ledgers, centre access/occupancy, CCTV metadata/view audit, muster, private-document audit.
- Tests/CI: production CI green; Omniqora safety contract tests present.

## Built but awaiting real provider activation
- NADRA: consent-aware connector and manual fallback are built. Live endpoint/token are intentionally absent pending authorised institutional onboarding.
- Microsoft Education: credential gate and provisioning boundary exist, but the function currently stops at ready_for_graph_provisioning; actual Graph user/licence/Teams provisioning is not implemented.
- Virtual labs: provider-neutral model/UI/provisioning boundary exists; real GitHub/AWS/Azure/managed-lab adapters are not implemented.
- STEMCoach: entitlement/campaign model and student UI exist; SSO/account provisioning/progress sync to the separate STEMCoach app are not yet live.
- Payments: payment rails/operations exist; each production bank/card/wallet provider still needs credentials, signed-webhook verification and reconciliation proof.

## Partially wired / requires completion
- Omniqora events: lab completion and residential placement completion are queued; submission and attendance triggers are scaffolded where their authoritative tables exist. Assessment finalisation, resubmission, tuition/STEMCoach and careers/progression still need authoritative server-side event emission.
- Intelligence: calculators/snapshots are deterministic foundations. Cohort membership and course membership must be constrained through authoritative enrolment/cohort joins before operational reliance.
- RAG/GraphRAG: approved-document registry, edges, index batch boundary and permission-first retrieval candidates exist. Actual chunking/embedding/vector search/reranking and central Omniqora AI gateway are not connected.
- Native: Capacitor readiness/config exists; native projects/plugins/store signing/push/secure storage/biometrics still need implementation.
- Course content: platform supports controlled content, but launch programmes still need complete approved Student/Teacher/Assessment/QA packs and specification version mapping.

## Not connected
- Central Omniqora Factory API/control plane.
- Central Omniqora AI gateway/vector infrastructure.
- Live Microsoft Graph provisioning.
- Live authorised NADRA service.
- Real lab-provider adapters.
- STEMCoach SSO/progress API.
- Production payment-provider credentials where not already configured externally.

## SaaS Factory target
Central Omniqora owns reusable product registration, tenant launch/provisioning, identity/federation, subscriptions, communications, AI gateway, event/observability contracts and reusable intelligence services. UniPathway retains education-domain workflows: admissions/KYC, qualification rules, courses, teaching, assessment/IQA, tuition, residential, vocational evidence, careers/progression and safeguarding.

Hierarchy: Omniqora -> UniPathway product -> landlord -> institution tenant -> centre -> school -> department -> programme/course -> cohort -> learner.

## Go-live priorities
P0: merge green #17; migration replay; generated Supabase types; real RLS/storage/Edge Function integration tests; authenticated E2E; backups/restore/monitoring.
P1: central Omniqora connector; Microsoft Graph; payment providers; NADRA onboarding; lab adapters; STEMCoach SSO; approved launch course content.
P2: native stores; calibrated intelligence models after pilot data; richer GraphRAG; scale/load testing and operational pilots.
