# Dashboard functionality review — 16 October 2026

## Conclusion

Dashboards are implemented at different levels. Route availability is not proof of complete functionality. The source inventory covers 133 page files and 197 literal routes. Its 64 button candidates require manual inspection: parent dialogs/forms/click handlers account for some candidates. Do not interpret them as 64 confirmed defects.

## Repaired in this pass

| Area | Confirmed defect | Repair |
|---|---|---|
| Shared dashboard queries | Default API row limit, late responses from previous account/filter, disabled queries stuck loading | Explicit 250-row pagination with ID ordering; discard partial failures and stale responses; account/tenant/roles invalidate visible results; disabled state clears loading |
| Exams | Invented dates, Hall A/B/C, invigilators, seating and registrations derived from module order; incident success was memory-only; assignment grades presented as exam results | Actual tenant-scoped academic calendar exam events; URL-aware sections and paging; visible load errors. Unsupported seating, entry, incident and verified result workflows are explicitly unavailable |
| QA | Inert Review/Auto-Sample/EV Pack buttons; missing similarity treated as zero; similarity labelled AI detection; graded labelled approved; unsupported compliance claims | Working read-only details, search, status filter, pagination and error/retry state; actual status and nullable similarity shown; unsupported moderation/sampling/export actions identified |
| Centre director | Generate Report only displayed a toast; charts merged years and grouped attendance by row position | Real invoice-summary CSV; year-month invoice buckets and Monday calendar-week attendance; excludes excused marks; explicit tenant scope and complete-load failure state |
| Finance | Failed invoice load displayed empty balances | Explicit unavailable/error state and retry |
| Student careers | CV generation claimed a PDF without creating one | Actual text draft download from submitted form fields; format labelled clearly |
| Email campaigns | Demo sent/open-rate figures; fake save-draft confirmation | Removed demo campaign records, marked delivery metrics unavailable, actual local draft download; no implication of server persistence or sending |
| Student grades | Zero marks became missing; appeal submission only changed local state | Preserve zero grades; disable unavailable submission, remove false receipt/review promise and direct learners to approved centre process |

The shared hook continues to rely on database RLS for record visibility; this change does not establish that every legacy RLS policy is safe. Explicit tenant filters were added to the director, exams and QA queries changed here. Pagination is not transactionally consistent during concurrent writes.

## Dashboard/feature status

| Dashboard family | Current evidence and remaining gap |
|---|---|
| Landlord | Routes and data queries exist. Export candidate and historical MRR calculation need repair/verification; revenue reconstructed from current tenant values is not historical billing evidence |
| Centre director | Corrected chart aggregation, scoped data loading and real CSV. Other management actions and live role tests still require acceptance checks |
| Admissions / partnership operations | Existing tested workflow work remains in PR22. Several legacy admissions URLs reuse one CRM; each specialised journey is not independently proven |
| Student | Core routes exist; grade/CV false-success defects corrected. Course/module enrolment scoping, submissions, fees, private files and grade release need authenticated staging checks. Appeals remain unimplemented on this page |
| Lecturer / programme leader | Teaching, attendance, marking, labs and messaging routes exist. Legacy classroom/marking policy alignment, material upload and register workflows need review |
| QA / assessor / EQA | QA now offers an honest read-only review queue. Dedicated moderation decisions, sampling, evidence packs and specialised QA aliases are not completed by this pass |
| Exams | Recorded calendar read works at source/component level. Persistent exam operations remain incomplete |
| Finance | Invoice read failure corrected; invoice/payment UI and separate Stripe calls exist. Settlement, refunds, commissions, instalments and institutional rails need live verification; several route aliases reuse the same dashboard |
| Marketing / agent | Campaign draft downloads now work locally; campaign storage/delivery remains incomplete. Agent Chase and several specialised route aliases need further work |
| Parent / employer / partner | Routes exist; linked-child/employer/partner record visibility and actions require authenticated tests. Employer job posting/profile and partner report buttons remain candidates |
| Security / residential / transport / HR / health | Source inventory exists; not functionally certified in this pass. Requires seeded-role acceptance and persistence checks |
| Intelligence / support / knowledge / readiness | Previous regression coverage remains green. See prior functional report for missing calculation callers, provider activation and live Storage gaps |

## Verification

- 143 application tests across 34 files passed, including query pagination, rejected partial reads, disabled loading, stale-account response suppression, exam route/content checks, QA details/paging and calendar aggregation.
- TypeScript and production build passed; lint has zero errors (warnings remain).
- Database schema was not changed in this pass. Previous 96 fixture checks are historical evidence, not rerun as a claim of live database verification.
- Browser installation remains blocked by the previously failed Chromium download. These are component/mock tests, not live browser journeys.
- No live provider requests, messages, migrations, deployments or merge performed.

See [full page/route/button inventory](UNIPATHWAY_DASHBOARD_INVENTORY.md) and [previous functional verification](UNIPATHWAY_FUNCTIONAL_CHECK_2026-10-16.md). The next acceptance pass needs staging accounts per role, seeded data and actual storage/provider access. All dashboards should not yet be called production-ready.
