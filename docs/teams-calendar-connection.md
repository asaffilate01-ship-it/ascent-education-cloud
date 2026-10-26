# Teams calendar connection — 26 October 2026

## Implemented and database-activated

The class scheduler now queues real Microsoft Graph calendar operations instead of requiring a pasted meeting URL. Educators select their module, an enabled mapped Microsoft organiser, the date/time and explicitly invited enrolled learners. The stored session feeds the existing student classroom. The worker creates a Teams-enabled calendar event and persists its returned event ID and join URL. Graph sends the invitations; the dashboard reports queue/provider status rather than claiming that a saved LMS invitation is delivered email.

Edits update the existing Microsoft event and attendee list without overwriting the Teams meeting body. Cancellations revoke local class access immediately, even if a mailbox is disabled or a provider operation is in flight. Provider cancellation then uses the event cancellation action; an in-flight receipt cannot restore the cancelled join link. Institutional Microsoft mailboxes are required; attendee addresses are hidden in invitations. Dates are sent in UTC; scheduler entry uses the device timezone and classroom listings use Pakistan time.

The database serialises schedule writes per centre and checks organiser, assigned lecturer, module and explicitly invited student overlaps. RLS restricts session visibility to assigned educators and currently enrolled, invited learners. Browser writes use narrow RPCs; provider receipts and job claims are service-only. Updates compare the revision loaded by the editor. The organiser cannot be silently reassigned on an existing Microsoft event: cancel and create a replacement if the mailbox owner changes.

Enrolment changes refresh existing invitation sets; they do not invite unrelated learners. Withdrawn learners immediately lose LMS class access. If an enrolment changes during provider processing, a successful receipt queues another roster refresh. Microsoft meeting admission remains subject to Microsoft identity, lobby and meeting policies: removing a calendar attendee is not a guarantee that a copied join URL is unusable.

Each request, worker claim, provider receipt, failure review and expired lease is audited. An uncertain operation goes to `needs_review`, not automatic resend. The Verify provider status action searches for the original transaction ID and checks the returned requested details. It never creates a second event merely because the first receipt is missing. A preflight failure can be retried after fixing its configuration. Unresolved or mismatching provider receipts require operator investigation.

## Activation required

Run `npm run worker:teams-calendar` on a server scheduler. Each invocation processes one class job. Required server-only configuration:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UNIPATHWAY_TENANT_ID`.
- `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`.
- `MS_CALENDAR_ENABLED=true` after consent and acceptance testing.

The Entra application needs approved Microsoft Graph calendar write and user-read permissions, restricted to the intended institutional mailboxes using the appropriate Exchange application access controls. Organisers need an Exchange calendar supporting `teamsForBusiness`, an enabled Microsoft identity and a suitable Teams licence. This connector does not provision mailboxes, change DNS, grant consent, configure recording policies or host itself.

Existing `microsoft_education_accounts` mappings must contain the correct Entra object ID, institutional email and enabled status. Provisioning creates disabled accounts by design; Microsoft administrator activation and LMS reconciliation are still required. Learners without connected institutional Microsoft accounts block delivery with an actionable preflight error. Do not mark a mapping ready without verifying the actual account and licence.

At implementation verification, the live database contained zero mapped Microsoft accounts and zero active enrolments. No real invitations were sent. Live provider acceptance is therefore outstanding.

## Validation

- 28 database checks: cross-centre isolation, uninvited/withdrawn learners, direct-write denial, overlap rejection, revision conflicts, worker claims/leases, cancellation and uncertain-response review.
- Nine Graph adapter tests: creation, update, cancellation, private recipients, institutional identity, unknown receipt recovery without resend, stale receipt rejection and pagination origin checking.
- Two scheduler UI tests, TypeScript and production build.
- Full 196-migration synthetic schema rehearsal, with provider-owned extensions explicitly deferred.
- Exact migration rehearsed in a live rollback transaction before transactional deployment and migration-ledger recording.

Remaining: real organiser/student invite-update-cancel acceptance; account activation reconciliation; worker hosting and operational alerts; weekly recurrence-to-calendar automation and room/resource calendars; full live classroom whiteboard/audio/recording backend deployment. This is not certification of those separate features.

Official APIs reviewed: [Create event](https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0), [Update event](https://learn.microsoft.com/en-us/graph/api/event-update?view=graph-rest-1.0), [Cancel event](https://learn.microsoft.com/en-us/graph/api/event-cancel?view=graph-rest-1.0).
