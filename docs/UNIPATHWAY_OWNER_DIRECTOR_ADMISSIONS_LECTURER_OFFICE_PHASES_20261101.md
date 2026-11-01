# UniPathway — Platform Owner, Centre Director, Admissions, Lecturer and Office Staff Release
**Date:** 1 November 2026  
**Repo:** `asaffilate01-ship-it/ascent-education-cloud`  
**Public/login domain:** `https://unipathway.pk` / `https://unipathway.pk/login`  
**Implementation location:** GitHub source; **no paid Lovable chat actions, no hosted database writes or publishing**.

## Independent live backend audit (read-only)

UniPathway Lovable project `2c97a03a-f146-4ff5-a22b-3765cf2f538f`, not the separate Dishbee Supabase connection:

- Platform has 2 tenant rows: UniPathway active, JHELUM onboarding. No configured tenant_domains; the platform public site already uses `unipathway.pk` in canonical and sitemap.
- The development Super Admin has a global `superadmin` role with null tenant; the Centre Director, Admissions Admin and Lecturer are separate centre-bound role memberships. **Do not rename their auth emails** by modifying profile text or changing public slugs. Any institutional-email migration requires verified mailbox ownership, Supabase Auth update, email delivery and login recovery tests.
- Live database has **no** `unipathway_onboarding_drafts`, `list_unipathway_incomplete_centres`, `resume_unipathway_centre_setup`, `save_unipathway_onboarding_draft` or `create_unipathway_centre_from_draft`. The legacy six-step wizard cannot be called operational. The new platform directory uses only the verified `tenants` table and explicitly records onboarding-only status.
- Live database has **no** invitation prepare/complete RPCs; the `invite-staff` Edge source is not a live end-to-end invite flow until its own transaction scripts, server secrets and mail delivery are deployed and tested.
- Live database has 0 compliance checklist rows, 0 scheduled classes, 0 live classroom sessions, 0 Microsoft Education accounts, 0 lab sessions/VMs. There are 26 integration rows and 65 readiness checks, but Microsoft Graph, education and virtual labs are **not configured**.
- Existing `programmes.awarding_body` enum supports only OTHM, QUALIFI, IAB. ATHE, Pearson, Cambridge, FBISE, Pakistani BISE, AKU-EB, NAVTTC and PSDF are not approved centre offers or validated exam entries simply because catalogue or compliance check pages mention them.

## Completed source/UI changes (not all provider-activated)

| Owner | Can use after server verification | Deliberate restrictions |
| --- | --- | --- |
| Platform Owner / Super Admin | `/landlord/centres`: read and search verified centres, create basic **onboarding** record, confirm name/branding edits, open platform staff/finance/readiness/audit | Centre delete/suspension, payment plan provisioning, SMTP, domain DNS and automatic director invitation are **not** implemented as verified lifecycle transactions. No silent Jhelum default centre. |
| Centre Director | `/director`: centre-specific applications/programmes/finance/teaching, compliance readiness and separate technology module/learner lab grants; `/director/staff-access` reviews personal office overrides | Cannot create/remove other centres. Existing direct `tenants` branding UPDATE has no director policy, so a new limited `update_unipathway_centre_branding` RPC is **staged only**, off by default. |
| Admissions Admin | `/admissions` and `/admissions/{documents,eligibility,offers,allocations}`: applicant-scoped KYC/identity/e-signature/invoice/offer/enrolment/module/lecture read checks | Sales kanban must never grant conditional/unconditional offers, invent a deposit or enrol a learner. Final server handover remains the only enrolment mutation. No automatic ID card, funding or external awarding-body decision. |
| Lecturer | `/lecturer`, `/lecturer/teaching`, `/lecturer/delivery-readiness`: assigned teaching modules, timetable, IELTS, whiteboard/Teams/lab availability indications | No proof Teams, Graph, whiteboard or AWS are provisioned; no access to assessor/IQA grade release via a teaching role. Explicit missing backend/provider indicators. |
| Office Administrator, HR Officer, Secretary | `/office`: server-authorised limited staff list, assigned tasks, centre timetable, aggregate HR leave count, permission profile. `/director/staff-access` allows manager `default/extra/less` capability selections; `invite-staff` is allowlisted | These roles are **not yet present in live `app_role`**. Browser feature flags are off. No raw KYC documents, grades, payroll, certificates, payments, provider API credentials, or director/superadmin powers. |
| Student on tech course | `/student/labs` and `/student/managed-labs` accessible only after an **active enrolment + approved tech module + current per-student entitlement** | No other student may gain access based on generic student role. The client, direct lab RLS, and AWS gateway each verify access; external AWS Academy enrolment is a separate provider action. |

### Compliance content and teaching

The new matrix covers OTHM, Qualifi, IAB, ATHE, Pearson BTEC/Edexcel, Cambridge International, FBISE, BISE Rawalpindi/Lahore/other BISE, AKU-EB, NAVTTC/NVQF, PSDF, PBTE, IELTS, English/German/French/Italian/Spanish/Arabic, language labs and technology/cloud labs. Each prompt is an **internal preparation item**; official centre approval, vocational accreditation, funding contracts, IELTS registration partner status, exam-centre approval and university progression are separate external decisions with official supporting evidence.

Course/material registry PR #176 still has separate staged source activation; avoid forcing historical unapplied migrations or accidentally creating an accreditation claim.

## Reviewed staging-only database changes, in order

1. `scripts/activation/unipathway-office-roles-forward.sql` — add the three office roles to enum, **commit before reusing the values**.
2. `scripts/activation/unipathway-office-access-forward.sql` — centre/user/role permission profiles, server-only manager revisioned write, audit log, minimal office summaries and approved personal capability overrides.
3. `scripts/activation/unipathway-staff-invitations-forward.sql` — auth-centre-role checked invite preparation, idempotent service-role completion. Server-only edge environment flag `UNIPATHWAY_STAFF_INVITES_ENABLED`; browser `VITE_UNIPATHWAY_STAFF_INVITES_ENABLED`.
4. `scripts/activation/unipathway-tech-lab-entitlements-forward.sql` — internal technology module approval, active student enrolment + specific lab grants, revocation, restrictive PostgREST lab select policies. Server flag `UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED` and browser flag `VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED`.
5. `scripts/activation/unipathway-centre-director-branding-forward.sql` — limited, authenticated director branding RPC. Browser flag `VITE_UNIPATHWAY_BRANDING_RPC_ENABLED`.
6. Source-only course material rights/schema from PR #176 requires its separate review and staging. Do not merge unapplied schema blindly.

### Before approving backend activation

- Inspect exact live UniPathway migration receipts versus the repository. **Never** replay 200+ unapplied historical migrations, and **never** run on Dishbee.
- Take a verified backup, create separate UniPathway **staging** with two independently assigned centres, directors, office staff and students, and rehearse each forward patch.
- Run `node scripts/test-unipathway-office-and-tech-db.mjs`: negative manager access, per-person defaults/deny, cross-centre staff lists, wrong permission revision, office invitation privilege escalation, backend service-role-only completion, non-tech students denied, expired/revoked tech access, direct lab_vms/lab_sessions RLS.
- Sign in as every listed role against staging with real JWT, verify permissions and revocations at direct PostgREST/Edge level, not only in browser; inspect auth callback URLs, invitation email success/failure, session revocation, CSP, and storage signed URL expiry.
- Confirm Teams/Graph, mobile sessions, recording policy, whiteboard database/realtime, AWS IAM/cost limits, language lab recording consent and accessible teaching rooms before advertising as live.
- User-facing staff portal is `https://unipathway.pk/login`; keeping existing development `@educloud.test` emails during release is intentional. To give staff an institutional `@unipathway.pk` address, verify the mailbox provider and ownership before using Supabase Admin email changes and appropriate recovery notifications.
- Ensure original lecturer-authored or explicitly licensed course material. Use official links for exam papers or restricted marking schemes if no redistribution permission exists.

## Why some features are disabled by default

The schema and Edge changes require host activation by a verified owner with the correct environment. Hiding a menu alone is not RLS, and client-controlled role arrays or checkbox selections cannot grant a right. Source code can be merged once CI passes, but **GitHub merge does not deploy Supabase SQL, private Edge functions, DNS or Microsoft accounts**.
