# Operations, guardian and native foundation release

Student library now loads active enrolments, published module materials and released class artifacts. It requests two-minute private signed links on demand; no demonstration catalogue or invented watch-time progress remains. Latest resource lists are capped at 500 each and explain that limit.

Centre directors can invite accounts or preview/import CSV batches of up to 50 rows, with per-row outcomes and retries that skip successful rows. Only superadmins can assign centre directors. SQL validates caller, centre, role and identity. Existing accounts are never moved between centres. Newly invited accounts may move from the signup default only with a matching trusted invitation, matching invitation timestamp, no established staff role/enrolment/invoice, and service-role completion. Profile triggers enforce that exception. Failed email issuance and partial access assignment are reported separately.

Centre onboarding saves country, city, registration reference and private document paths, then invites the centre administrator. Partial failures retain the created centre ID during the form session for retry. The centre stays in onboarding. Accreditation, billing and provider activation are not implied by saving the form.

Learners separately grant attendance, schedule and communication access after centre verification. Results permission remains separate. Shared schedules contain no Teams join URL. Staff verify confirmed same-centre identities with an evidence reference; verification records actor/time and resets consent. Parent links with conversations cannot be reassigned to another identity. Guardians and assigned staff can exchange in-app messages; this is not email/SMS/push delivery. Revocation removes access on the next read. Staff support routes are available to directors, admissions and lecturers.

Migrations:
- `20261024092731_unipathway_operations_and_guardian_scopes.sql`
- `20261024141630_unipathway_native_devices.sql`
- `20261024143459_unipathway_native_push_delivery.sql`

Deploy `supabase/functions/invite-staff` after the migrations. Confirm hosted schema history before applying anything: the source history contains reviewed fresh-staging overrides that are not a production repair bundle. Hosted Supabase inspection was denied by the connected tool during this build; no hosted migration deployment is claimed. Native configuration and release gates are documented in `NATIVE_APP_READINESS.md`.
