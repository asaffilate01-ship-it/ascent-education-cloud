# UniPathway release reconciliation — 18 October 2026

## Scope
Source: `asaffilate01-ship-it/ascent-education-cloud` (`main`) and the **existing** UNIPATHWAY Lovable project's Supabase connection. This report is an inspection record, not a claim of production certification or completion of unavailable external systems.

## Verified evidence
- Lovable project: `2c97a03a-f146-4ff5-a22b-3765cf2f538f`; DB enabled (Supabase).
- At inspection: 57 public base tables, each with row-level security enabled, and 154 policies. RLS being enabled does **not** establish that every policy is safe.
- The Lovable database's `supabase_migrations.schema_migrations` contained only four older recorded versions: `20260813103749`, `20260816114159`, `20260929181505`, `20260929181522`.
- No `international_*`, `ielts_*`, or `production_*` public tables were found in that database. The current GitHub source has UI/services/migrations that reference such objects. Their real-world functionality therefore cannot be marked green until staged migration reconciliation and role acceptance tests.
- 207 declared application routes; sidebar had five stale targets before this branch. All defined mobile role tabs are now checked against application routes by a Vitest regression.
- The public mobile site previously had no bottom bar; the existing bar was restricted to authenticated users. Now a five-tab public experience and explicit mappings for all 17 roles are implemented.

## Security findings and changes
1. **High / P0: exposure of private referral data.** Public policy `University partners view own referrals` allowed **any** user with `university_partner` role to SELECT the whole `referral_income` relation, including student names and payment references. No verified institution-to-user membership relation was found in the inspected schema. The migration removes this blanket SELECT policy. Institution-specific access must not be enabled until membership can be proven server-side; finance/director/admin policies remain.
2. **High / P0: client metadata role escalation.** The policy for self-assigned roles included `agent`; `assign_default_role`, `handle_new_user`, and `ensure_my_account` trusted a client's `account_type=agent` metadata to assign agent status. The migration restricts new self-service roles to `student`, updating the security-definer functions too. Agents require staff checks and separate approved role assignment. The registration screen explains this.
3. **P0 deployment mismatch.** SQL changes committed to GitHub are **not** automatically installed on the Lovable-connected Supabase database. Independently verify SQL migration replay in staging, backups, deployment record, staff access, and tenant separation before treating a fix as live.

## Functionality and flows (current verification)
| Area | Source status | Production verification |
| --- | --- | --- |
| Branding, website, admissions pages | Implemented, responsive update in this PR | Compare live site/preview after Lovable sync |
| Public tab navigation and mobile persona tabs | Implemented; route contract test added | Manual mobile/iOS/Android and keyboard QA required |
| Registration, login, multi-role navigation | Present | Re-test approved agents, reset, email verification, multi-tenant access |
| Course catalog, materials, LMS, assignments/marking | Components and schema/migrations present | Real course-content coverage, uploads and submissions not fully assessed |
| Payments, invoices, referrals, commissions | Frontend and source migrations present | Gateway settlement, student mapping and newer migration replay unverified |
| IELTS mocks, university agent workflows, education intelligence | Source implementations exist | Required Lovable database objects missing at inspection; blocked |
| Edge Functions / external connectors (Teams, STEMCoach, Turnstile) | Function source and integration contracts exist | Deployment/secrets/provider acceptance unverified |
| Residential dates, trips, room allocation | Planning UI/source present | Venue, safeguarding, accessibility and operations evidence pending |
| RLS/roles | 57 public tables with RLS; serious policies identified | Apply hotfix, then genuine two-tenant negative/positive tests |

## Release gate (no publish)
1. Safely apply reviewed RLS patch to Lovable Supabase with an audit trail; re-inspect policy SQL and signup functions.
2. Inventory and reconcile all missing migrations **in staging first**, with a tested backup and rollback path; never blindly replay all on production.
3. Run two-tenant permission tests for student, agent applicant, verified agent, university partner, staff, and superadmin; verify positive and negative reads and writes, storage buckets, exported reports and Edge Functions.
4. Check international enquiry challenge on the actual published origin with Cloudflare Turnstile key and secret. Do not enable unauthenticated submissions without server verification.
5. Test payment/commission lifecycle against signed agreements and receipts. Do not display unverified university logos or accreditation.
6. Run actual role-based browser/mobile smoke tests, visual verification of the selected brand, and the existing GitHub CI.

Supabase remains connected through Lovable. No new standalone Supabase project is requested, and publishing is a separate approval.
