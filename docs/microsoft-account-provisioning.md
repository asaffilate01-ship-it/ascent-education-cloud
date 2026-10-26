# Microsoft institutional account provisioning

## Delivered

The previous `microsoft-education-provision` endpoint only returned a proposed UPN. It now accepts an existing LMS `userId` and queues it through the same authorised RPC used by the Teams setup page. Browser callers cannot choose a domain, Microsoft tenant, licence, role or arbitrary display name. Centre directors and superadmins may request eligible users within their own centre. Students need an active enrolment. The worker rechecks eligibility and requester authority on every claim.

The setup page has searchable account selection, queue status and explicit retry. New queue/account tables work with the legacy production schema without activating the separate modern classroom stack. Existing branding/template areas still require that stack.

`npm run worker:microsoft-accounts` claims one job and calls Microsoft Graph. It validates a verified **Managed** domain, uses a deterministic UUID-derived UPN and writes an ownership marker to `onPremisesExtensionAttributes.extensionAttribute15`. Reserve that attribute for this workflow. It refuses to adopt existing accounts without that marker, synchronised identities, enabled accounts or unconfirmed licence receipts. A partial attempt can be retried without creating another account. Jobs have five-minute leases, unique claims and a five-attempt recovery cap; failed jobs require an explicit authorised retry.

Accounts are created **disabled**, with Pakistan usage location and a generated password that is never logged, stored or returned. A student/staff licence is assigned, then the actual Graph response is verified. The LMS records `provisioned_disabled` and `disabled_at`; it does not offer the account as a ready meeting organiser. Licences can incur charges even while sign-in is disabled.

## Required server configuration

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UNIPATHWAY_TENANT_ID`.
- `MS_PROVISIONING_ENABLED=true` only after the institution authorises account creation/licence allocation.
- `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` via secret management.
- `MS_ACCOUNT_DOMAIN`: a verified managed institutional domain. Federated domains need their own identity flow.
- `MS_STUDENT_LICENSE_SKU`, `MS_STAFF_LICENSE_SKU`: actual subscribed SKU UUIDs, including appropriate Teams rights. No assumed free education eligibility.

Use a dedicated Entra application with administrator-consented permissions for domain verification, user creation/read and licence assignment. Official API references below specify the current minimums; do not grant broad directory write access unnecessarily. Test least-privilege consent in a nonproduction Microsoft tenant first. Run the worker on Node 22+ under a scheduler. No worker is started by deploying the frontend or migration. Graph throttling, unavailable licences and permission errors become safe error codes; provider responses and passwords are not copied into the queue.

## Administrator handoff and remaining boundaries

The Microsoft administrator must complete identity verification, reset the password or approved passwordless onboarding, apply conditional-access/MFA policies, enable the account and verify Teams/mailbox readiness in Microsoft. Reconcile the LMS account mapping/status only after those checks. This release does not automatically activate accounts, send credentials, create calendar invitations, assign Teams presenter roles, implement tenant-wide lifecycle suspension, or certify the recording service. Those are separate tasks, not implied by a completed provisioning job.

Accounts created just before a network failure stay disabled. Keep the same domain/tenant configuration during retries and reconcile any orphan before changing it. There is no automatic account deletion. Existing users requiring migration or a friendly institutional alias need reviewed mapping rather than bulk adoption.

## Validation

`npm run test:microsoft-accounts`: six Graph contract/failure tests and fourteen actual PostgreSQL permission, tenant, idempotency, claim/lease and disabled-mapping checks. The full synthetic schema rehearsal passes 193 migrations. TypeScript and frontend build are checked before merge. Provider tests use injected Graph responses, not real Microsoft credentials; live account/licence acceptance is still outstanding.

Official references reviewed 26 October 2026:
- https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/user-assignlicense?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/domain-get?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/resources/onpremisesextensionattributes?view=graph-rest-1.0
