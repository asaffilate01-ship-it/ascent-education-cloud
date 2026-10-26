# Funding, family overview and responsive design

Public and portal layouts keep the approved UniPathway imagery and navy/green branding. The home course finder now has subject filters, with search and a recovery action. The public header is shorter on desktop; the mobile drawer hides competing bottom tabs. Shared controls have larger touch targets, clearer focus and darker muted text. Dashboard headings and descriptions now sit above content, with simpler quick links and consistent spacing. Finance uses task cards on phones and a table on desktop.

## Funding

Finance/directors can allocate approved sponsor cover and record cumulative verified sponsor receipts separately from student payments. Audit events are immutable to clients. Approved cover cannot be reduced into student debt. Fee increases and reassignment of funded invoices are rejected. Student summaries use a narrow own-account RPC; funded invoices are inaccessible to the legacy learner checkout query. Funded learners must arrange payment of their own share with finance until the gateway is funding-aware. No learner enrolment or learning access is automatically suspended for sponsor arrears.

This is agreement/receipt tracking, not bank reconciliation, government claim submission, sponsor-place procurement or a full accounting ledger. Corrections reducing cover or receipts require a separately reviewed adjustment workflow. The existing invoice CSV export and other older financial reports still need funding-aware reconciliation before use as debtor statements. The checkout source guard also needs its normal edge deployment; the deployed database restriction protects the legacy caller-JWT checkout in the meantime.

Migration 20261026064754 passed a live rollback rehearsal and was applied to UniPathway with a migration-ledger entry. It does not backfill sponsor cover or alter existing fee amounts. There are no fabricated financial records.

## Parents

A child-by-child Pakistan-calendar weekly overview combines consent-checked class schedules, attendance and released feedback. Selection travels into attendance, results and learning-plan links. Revalidation errors remove old weekly data; unavailable information is not presented as zero attendance or a grade. The learning-summary service gains the actual guardian-link ID only on databases where that service already exists; existing consent predicates remain intact.

The production legacy database does not yet contain the modern guardian activity/results/learning services and their prerequisite academic schema. The UI reports unavailable feeds; this release does not claim live family-data acceptance or silently grant broad parent access. Full modern academic-backend deployment and authenticated parent acceptance remain outstanding.

## Validation

- TypeScript application check and production build passed.
- 44 targeted component/unit tests passed, including fee separation, revoked sharing, selected-child links and Pakistan week boundaries.
- 22 database checks passed for funding roles, tenant isolation, checkout exclusion, allocation constraints and immutable evidence.
- All 188 migrations passed synthetic PostgreSQL schema rehearsal; provider extensions remain deferred as previously documented.
- 22 browser assertions checked public routes at 360, 768 and 1440px, course category filtering, menu dismissal and overflow. Desktop/mobile screenshots reviewed.
- Authenticated production dashboards still require real role-account acceptance; responsive public checks are not a claim of complete live role testing.
