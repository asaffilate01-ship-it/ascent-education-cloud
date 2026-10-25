# Learning journeys and assignment access — 25 October 2026

## Delivered

- A consistent entry/duration/delivery/fees/intake summary on qualifications, technology, accounting, beauty, German, IELTS and tuition pages. Unconfirmed details remain enquiries, not invented course promises.
- `/apply` routes visitors to Pakistan course enquiries or the UK/Germany consultancy wizard. The wizard supports an optional browser-local draft for seven days, progress and server-confirmed submission. The existing contact-form endpoint stores the application review details in admissions notes as a lead; it does not create an approved enrolment or upload documents.
- Student classes and coursework precede statistics; continue-learning modules, invitations and materials have explicit links. Times are displayed in Pakistan time.
- Programme management supports lecturer assignment and keyboard selection, with loading/error handling and a stacked mobile layout.
- Schedule Manager no longer displays demo classes. It reads saved schedules, checks potential overlapping bookings, and saves weekly entries using the module's assigned lecturer. Live meeting invitations remain separate. Conflict checks are advisory client checks over visible records, not a complete server-side concurrency guarantee or a student-cohort clash engine.

## Live database change

Migration `20261025225129_core_learning_assignment_rls` was rehearsed in a rolled-back production transaction, then applied and recorded in the migration ledger. It replaces 17 legacy policies with 24 policies across modules, student_enrolments, assignments, scheduled_lectures, classroom_sessions and classroom_recordings. Legacy auto_schedule_module and auto_enrol_student now run as SECURITY INVOKER. Client TRUNCATE privileges are revoked.

Post-deployment catalog checks confirm RLS on all six tables, the 24 policies, both functions as invoker, and no anonymous EXECUTE on those two functions. The public-table inventory query found no public base table with RLS disabled. These checks do not certify every policy or every service-role endpoint.

| Role | Core learning access |
|---|---|
| Superadmin | Cross-centre management, validated course/tenant relationships |
| Centre director / programme leader | Management inside assigned centre |
| Admissions admin | Validated student/course enrolments; course/module lookup |
| Lecturer | Assigned module teaching records only |
| Student | Active enrolled course/module records; published or active assignments |
| Agent, finance, marketing, security, parent, partners | No general teaching-record access through these six tables |
| Assessor / IQA / external QA | Specialist assessment access remains through separate allocation policies |

There is no blanket “staff” permission. Job-specific roles are intentional. Agent application permissions and specialist assessment, funding, storage and provider permissions require their own acceptance checks.

Live inventory at verification: 28 modules, zero student_enrolments, zero scheduled_lectures, zero classroom_sessions. No real roster or timetable was fabricated. Admissions must validate the student profile, centre, programme and active status; management assigns module lecturers; schedules and live invitations then follow those assignments. Changing a module lecturer requires reviewing existing schedules and provider invitations separately.

Migration `20261025232741_lecturer_assignment_directory` adds a narrow lecturer-role directory read for programme managers so assignment choices load without granting general role management.

## Remaining deployment and operational work

The live database is behind the repository's newer LMS schema. New materials, assessment and live-class features must not be described as live-verified merely because the frontend is published. Reconcile and deploy their dependencies in staging, then run real-role acceptance for materials/downloads, invitation revocation, released recordings and independently marked results. Storage and Microsoft/Teams permissions must match database access. Omniqora credentials/endpoint activation remains separate.

Funding receivables need a verified sponsor ledger and action queue; ordinary overdue invoices do not establish student liability for unpaid government/employer funding. No automatic suspension rule was added here.

The October provider CCTV registry is now `unipathway_cctv_cameras` to avoid collision with the existing September `cctv_cameras` schema. The legacy registry remains intact. This fixes schema replay; it does not activate a CCTV provider.

## Validation

- 107 offline PostgreSQL role/assignment checks, including 18 roles, cross-course/tenant access, draft visibility, withdrawal, forged lecturer assignments, actual scheduling RPC access and TRUNCATE denial.
- Fresh replay of 185 repository migrations and the bundled verification suites passes with provider-only pg_cron/pg_net work deferred. Synthetic Auth/Storage is not provider acceptance.
- 28 targeted UI/navigation/application/conflict tests pass.
- TypeScript checks and production build pass.
- Browser checks at 320, 390, 768 and 1440 px cover eight changed public routes (32 route/viewport checks), plus saved-draft restoration.

`learning-access-policy-rollback.sql` preserves the former policy definitions for incident recovery only. It restores known broad legacy access; it intentionally does not re-grant dangerous table privileges. Review migration ledger reconciliation before using a rollback.
