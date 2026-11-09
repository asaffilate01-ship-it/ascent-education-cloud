# UniPathway Phase D — versioned course sources & private distribution rights
**Release scope:** source/UI/isolated test only. **Not applied to hosted database.**

## Separate environments and baseline

- UniPathway Lovable project: `2c97a03a-f146-4ff5-a22b-3765cf2f538f`, GitHub: `asaffilate01-ship-it/ascent-education-cloud`.
- Its live `public.programmes.awarding_body` enum currently allows only `OTHM`, `QUALIFI`, `IAB`. That is *not* a registry of centre approvals for other qualifications.
- Previously verified: five programme records, 28 modules, no module-material or structured-lesson records; source migration count is far larger than the hosted migration ledger.
- The connected **DISHBEE** Supabase project is different and **MUST NOT** be used for UniPathway.
- The separate proposed full syllabus migration `20261020160000_unipathway_full_centre_exam_syllabuses.sql` is not present in the hosted UniPathway schema and must not be replayed indiscriminately.
- No third-party awarding-body specifications, exam banks, copyrighted books or licences are included in this repository change.

## Delivered code

1. A staged **additive SQL forward patch** at `scripts/activation/unipathway-course-specifications-and-rights-forward.sql`, deliberately kept outside the unapplied historical `supabase/migrations` ledger until manually reconciled. It creates only two new tables and associated policies/functions/trigger:
   - `unipathway_course_specifications`: centre + exact board, qualification and subject codes, version, exam session, official HTTPS source, optional linked module, creator, reviewer and dates. Every new record is an unverified planning/source draft; review is **not external centre accreditation**.
   - `unipathway_material_rights`: one active evidence record for each private file, tied to a reviewed specification and exact module; original work or written redistribution licence (with licence expiry), rights holder, evidence reference, separate reviewer and withdrawal status. `official_link_only` can never authorise file publication.
2. `unipathway_acl.course_rights_active` must confirm a live approved licence, reviewed specification and consistent module/tenant. A database trigger refuses publishing a file without these conditions. **Restrictive** row-level policies protect material metadata and the private storage object after licence expiry/withdrawal. Existing module permissions still apply.
3. Public review RPCs are `SECURITY DEFINER` but explicitly check an authenticated `auth.uid()`, centre-manager membership and a different person from the author. `PUBLIC`/anonymous execution is revoked, access is granted to authenticated reviewers only.
4. Role-guarded manager workspace `/director/specifications`, `/programme/specifications`, `/landlord/specifications` for draft creation and independent source/rights review.
5. A private draft's **Rights evidence** editor for authorised lecturers and managers, followed by a separate manager approval; ordinary material publication is disabled until this chain is activated and verified.
6. `src/test/course-specifications-access.test.tsx` and `scripts/test-unipathway-course-specification-rights-db.mjs` cover static UI gating and synthetic cross-centre RLS, reviewer separation, attempted publication without rights, licence withdrawal and private object access.

## Required rollout — no automatic live SQL

- **1. Approval and backup.** Confirm a separately provisioned UniPathway **staging** project (project ID, URL and dedicated test users). Review the approved source-to-hosted schema diff; take a verified snapshot and record a tested rollback plan. Do not use `supabase db push` with all historical migrations.
- **2. Rehearse.** Run `node scripts/test-unipathway-course-specification-rights-db.mjs` in local CI. Once an approved UniPathway staging DB is available, apply the **single** forward SQL transaction there, and use a one-off migration receipt generated via the current Supabase CLI. Never pretend a local PGlite passing test proves hosted parity.
- **3. JWT/RLS acceptance.** Test director A1 creating a draft, independent A2 reviewing it, lecturer A proposing evidence, director A2 approving; lecturer from another module, student A, staff B, student B and unauthenticated/anonymous all denied for private drafts and other-centre data. Confirm `auth.uid()` checks and direct PostgREST/Storage signed URL access. Test future, withdrawn and expired licences, source withdrawal, role removal, cross-centre changes, role switch and concurrent reviews. Check negative direct UPDATE/DELETE/RPC misuse.
- **4. Provider and legal evidence.** For every board, store its exact current syllabus/qualification code, version/years, official source, permitted usage and rights-holder approval. Link to the board's authorised portal for `official_link_only`; do not upload third-party question banks, mark schemes or publisher copies without a licence expressly allowing LMS redistribution. Academic source review does not confer exam registration or qualification awarding rights.
- **5. Activation.** After independent review and hosted verification, enable `VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED=true` only for the correct UniPathway environment. Rebuild and publish through an approved Lovable release; verify actual logged-in role dashboards, expiring storage links, mobile/desktop, errors and audit records.
- **6. Emergency stop.** Turn the feature flag off and deploy the previous UI version. In urgent cases restrict authenticated material reads in the **UniPathway** database while the reviewed forward patch remains in place; never drop/alter published evidence without a separate authorised retention decision. Already-issued signed URLs can remain valid until their configured expiry.

## Dependencies and limitations

- Source patch uses existing `modules`, `unipathway_module_materials`, `profiles`, `user_roles`, `app_role` and `unipathway_acl`; the hosted schema has these today, but only staging rollout proves the new patch can be installed.
- Browser flags are UX switches, **not** security. Database RLS and trigger are the actual enforcement points.
- Approval requires a second manager; UniPathway must create actual staff accounts with the correct centre memberships.
- New ATHE, Pearson, Cambridge and Pakistani board records do **not** extend the existing `programmes.awarding_body` enum or authorise enrolment, official exam registration or certificate issuance. A separate approved course-offer model and awarding-body contract remain required.
- The existing private materials uploader's rights-checkbox is an acknowledgement only; it is not permanent legal evidence. The new reviewed ledger supplies that separate evidence after deployment.
- Unapproved course materials must remain private drafts. No model-generated official learning outcomes, marking decisions, qualification approvals or legal licences.

## 9 November 2026 rebase on current protected material workflow

This staged rebase preserves the newer `ModuleMaterials` protections: the existing `publish_unipathway_course_material` RPC remains the **sole publication authority**; class-linked content stays under the 24-hour/12-hour post-class release policy, storage signing, active membership and centre checks. The legacy direct `UPDATE publication_status='published'` from the older branch is **not ported**.

The new `VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED` gate is **off by default** and makes no registry request or live rights enforcement until the reviewed forward SQL, hardened server triggers/storage policies and authenticated two-centre tests are applied through a separate approved staging rollout. When enabled, the user-facing review also checks approved, unexpired redistribution evidence before calling the existing server RPC; this UI check is additional defence only, not a substitute for the database guards.

No live schema migration, Lovable credits, production configuration change, external awarding-body integration, student record change, or production publication is part of this source phase. Independently review the staged SQL and conflicts in superseded PR #176 before any deployment.
