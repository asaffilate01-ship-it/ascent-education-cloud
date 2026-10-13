# UniPathway — Global Education Partnerships Hub (phase 1)

## Scope
This extension **does not imply a partnership with the listed organisations**. The migration seeds internal leads for recruitment groups, application aggregators, awarding bodies, language and academic pathway providers. All records start as `prospect` with no agreement, commission rate, accreditation or verified route.

Existing UniPathway admissions, the agent portal, finance and `international_university_applications` remain the canonical workflows. The new catalogue and prospective pathway route registry extend them instead of replacing them.

## Pages
- `/director/global-partners`: centre director prospects + draft pathways.
- `/landlord/global-partners`: superadmin view.
- `/admissions/global-partners`: read-only admissions view.

## Data design
- `international_education_partners`: tenant-specific organisations, classification, destinations and relationship status.
- `international_pathway_routes`: course-specific proposed routes with evidence requirements and unpublished default.
- `international_partner_agreements`: actual signed contracts, commission terms and clawbacks (not seeded).
- `international_partner_referrals`: referral records with explicit consent required before submission.

Tenant-aware foreign keys prevent a partner, awarding body or route from another tenant being linked. RLS restricts private commercial data; agent/student access to prospects and contracts is denied.

## Next implementation milestones
1. Add signed-agreement upload and approval workflow with private storage and audit history; only then can a relationship be moved to contracted/active.
2. Connect agent and student applications to referral records using server-side checked consent and institution authorisation; institution-scoped partner portal permissions are required before sharing student data.
3. Introduce credentialed integrations *only with provider-issued access*; most organisations have no confirmed public admissions API. Until then, use secure manual submission and external portals with audit trails.
4. Add course catalogue synchronisation, university-specific verified entry criteria, published student search, commission invoice matching, refunds and clawback reconciliation.
5. Replay migration, regenerate Supabase types and run RLS-negative tests for cross-tenant access, verified/published route controls, consent and finance.
6. Obtain written partner agreements and qualifications/centre approval independently of software build.

Do not deploy this migration before tenant/RLS tests and production database backup checks.
