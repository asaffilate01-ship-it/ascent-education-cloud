# Consolidated Live Audit — 2026-10-04

## Source of truth
This audit reconciles the implemented UniPathway repository with the agreed education/Omniqora/STEMCoach operating model. Code existence is not treated as proof that an external integration is live.

## UniPathway — built
Multi-tenant landlord/tenant/centre architecture; role portals; admissions; course catalogue/factory; OTHM/Qualifi/IAB/ACCA-ready course routes; Pakistan short/employer/vocational/tuition structures; funding/PSDF readiness; Teams/live-class architecture; whiteboards; learning/assessment/marker/IQA architecture; integrity/AI agents; careers/jobs/internships/progression/university partner flows; residential semester weeks, placements and cultural programme; virtual labs; secure portable centre IT lab; physical access/visitor/occupancy/CCTV/muster architecture; STEMCoach entitlement foundation; PWA/native readiness; production readiness registry.

## Omniqora Education — built on PR #17
Factory registration contract; education event stream/outbox; Student/Cohort/Course/Organisation/Institution 360; intervention model; criterion intelligence; permission-first RAG/GraphRAG document/edge model; indexing/retrieval boundaries; executive snapshot calculator; production security contracts; migration verification script; backup/restore/load-test plans.

## Not yet proven live
Central Omniqora remote Factory/API connection; real vector/embedding provider; real Microsoft Education/Graph tenant credentials and end-to-end provisioning; NADRA production credentials; payment/mobile-wallet/bank production webhooks; institutional email/SMS; Turnitin/API if selected; virtual-lab provider production adapters; STEMCoach SSO/progress sync; physical door/NVR/VMS hardware; Apple/Google signed native releases; real backup restore drill; real 3,000 learner load test; real authenticated cross-tenant RLS test suite against deployed DB; clean migration replay evidence; complete launch-course content/approval packs.

## Content gap
Platform architecture supports regulated and local course families, but actual approved Student Pack / Teacher Pack / Assessment Pack / QA Pack content must be completed and approved course-by-course. Never infer awarding-body approval from platform capability.

## Publish rule
Lovable preview/publish is appropriate after the current green PR is merged to main and post-merge main CI is green. Use it for visual/UX and browser smoke testing. Do not treat Lovable publish as production sign-off for security, RLS, migrations, external credentials, awarding-body approval or operational readiness.

## Live sequence
1. Merge green PR #17 to main; verify main CI.
2. Publish main to Lovable staging/preview and execute persona/browser/mobile UX smoke.
3. Fix visual/navigation/runtime issues on a new branch; green CI; merge.
4. Deploy/replay migrations in a non-production Supabase environment and execute authenticated RLS/storage/Edge Function tests.
5. Connect and test external providers one by one; Production Readiness remains blocked until evidence exists.
6. Seed pilot content/cohort and run end-to-end admissions -> teaching -> assessment -> QA -> progression/payment journeys.
7. Restore drill + load test + safeguarding/security/residential SOP evidence.
8. Controlled pilot cohort.
9. Production go-live after zero P0 blockers.
