# UniPathway institutional communications

## Delivered software

`/communications` is available from dashboard navigation and the header mail badge. Students, agents and staff see authorised institutional mailboxes; centre directors/superadmins can oversee centre correspondence and configure membership. Sending and task management require explicit send membership, including for administrators. Removing membership removes access to messages, alerts and private documents immediately for new requests. Already issued document URLs expire after sixty seconds.

The workspace includes searchable recent conversations with additional history loading, drafts and explicit queuing, replies, conversation ownership, reassignment, to-do/in-progress/waiting/completed states, priority and due dates, assigned tasks, overdue reminders, unread alerts, private documents and append-only audit events. Mailbox configuration/membership changes have a separate immutable audit table. Uploaded and provider-imported document metadata creates its audit entry in the same database transaction. Users cannot edit or delete sent records or audit rows through the Data API.

All application-originated email uses a registered `@unipathway.pk` mailbox as From and Reply-To. External senders/recipients remain supported for parents, employers and partners. Readable email bodies are rendered as text, never executable HTML. Identity/password-reset secrets are not broadcast to administrative dashboards.

Omniqora is the sole AI provider. `omniqora-comms-assistant` reads only the caller's authorised conversation, applies the existing account quota, records the request and asks Omniqora for a summary, suggested actions and a draft reply. Email text is untrusted input. AI does not send, assign, mark tasks complete or take financial actions. The output is explicitly advisory and can be copied into a human-reviewed draft/task.

## Existing hosted email — selected by the owner

The owner confirmed that `unipathway.pk` currently uses **other hosted email**, not an assumed Microsoft 365 mailbox. Keep existing DNS and mail hosting until the provider is identified and tested.

Register each actual mailbox in the dashboard using **Hosted email (IMAP/SMTP)** and grant its owner/members access. This creates no mailbox at the host. Set these secrets on a server running Node 22+:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UNIPATHWAY_TENANT_ID`.
- `UNIPATHWAY_COMMS_ENABLED=true` enables mailbox import.
- `UNIPATHWAY_COMMS_SEND_ENABLED=true` separately enables processing explicitly queued email.
- `UNIPATHWAY_IMAP_ACCOUNTS_JSON`: a secret JSON map keyed by dashboard mailbox UUID. Each entry contains `address`, `imapHost`, `smtpHost`, `user`, `password`, and optionally `smtpPort` (465 or 587), `smtpUser`, `smtpPassword`. Never put this in VITE, the repository or browser fields.

Run `npm run worker:comms-hosted` on a scheduler. IMAP requires TLS on 993, SMTP requires TLS or mandatory STARTTLS, certificates are verified and protocol logging is disabled. Provider credentials must be mailbox-scoped. IMAP/SMTP application passwords or a provider-specific OAuth integration may be required; OAuth-only hosts are not certified by this password-based adapter.

The worker discovers selectable folders, imports existing mail and incremental UIDs, retains per-folder UIDVALIDITY checkpoints and uses RFC Message-ID/references for threading and idempotency. Each invocation processes up to fifty least-recently-synchronised folders and one hundred UID positions per folder. Large histories therefore backfill over multiple runs. Messages above 25 MB stop that mailbox's import with an explicit review error rather than silently advancing its checkpoint. Deletion in the source mailbox does not erase the LMS correspondence record; retention/purge policy needs institutional configuration.

SMTP sends use deterministic institutional Message-IDs and reply references. A synced sent copy can reconcile the queued record. SMTP acceptance is not recipient delivery. Partial acceptance, timeout or interrupted processing goes to manual review; the system does not blindly resend. Dashboard-originated sent messages already remain in the LMS outbox. Configure provider-side sent-folder saving if the host does not save SMTP submissions automatically.

## Optional Microsoft 365 connector

`npm run worker:comms` supports registered Microsoft Graph mailboxes, including nested folders and persisted delta cursors. It needs the standard Microsoft tenant/client secrets and mailbox-scoped Mail.Read/Mail.Send application permissions. It verifies the Graph identity against the configured institutional address. External pagination/cursor URLs and different mailbox paths are rejected. Graph native reply actions preserve provider conversation threading. Incoming mail sent to the hosted service will not appear in Graph unless mail actually resides there; Teams licensing alone is not a mailbox migration.

## Documents and audit

Both connectors import supported file attachments into the private `unipathway-comms` bucket. PDF, PNG/JPEG, plain text and DOCX up to 10 MB are supported, with at most fifty attachments per message. Other attachment types, nested attached emails, reference attachments and oversized originals remain at the provider and are identified in the UI. Content hashes make repeat imports idempotent. Files download through short-lived authorised URLs. Antivirus/quarantine integration and an approved retention schedule remain necessary before claiming enterprise document protection.

Dashboard uploads are case documents, not automatically email attachments. Outgoing attachment selection/sending and full provider-original MIME export are still separate gaps. The UI shows stored text bodies up to 100,000 characters; originals remain at the mail host. This is not a certified complete mailbox backup or legal archive.

The legacy `send-email` function now saves an authorised institutional draft rather than sending from caller-controlled addresses. The unused public `notify-application` endpoint has been retired because it trusted caller-provided recipient and tenant IDs. The current verified enquiry workflow remains separate. Deploy these edge changes explicitly; merging source or applying SQL does not certify that old endpoints have been replaced. Auth SMTP and any external transactional senders must be configured/journalled separately; do not claim every historical email is already captured.

## Activation and acceptance

Database migration was rollback-rehearsed and applied to the live Lovable database, and tested against the legacy schema and the full 194-migration fresh-schema rehearsal. Catalog checks confirm private storage and deny anonymous mail reads, browser worker claims and audit updates. No mailbox, employee/student record, credential or real message is fabricated. No worker is started by publishing the frontend. Before activation: identify the host; obtain server settings and secure credentials; register each mailbox and permissions; configure SPF/DKIM/DMARC and domain/alias restrictions at the provider; deploy the AI/legacy edge changes; host the workers; test inbound/outbound/reply/attachments and permission removal with actual student, agent and staff accounts; confirm provider acceptance versus delivery/bounce handling.

Tests: PostgreSQL RLS, cross-centre and same-centre isolation, membership removal, send claiming, uncertain delivery, SMTP sent-copy reconciliation, task status, reminders and immutable audit/documents; connector cursor/TLS/sender/thread tests and a real MIME compose/parse round trip; dashboard draft test; TypeScript and production build.

## Other outstanding work remains explicit

This communications release does not complete Teams calendar invitations, live language-room audio/intercom, cloud desktop lifecycle, Pakistan gateway settlement, advanced offline/content compatibility or every specialist dashboard. The communications system provides the shared inbox/task/history layer those workflows can connect to; those integrations still require their own implementation and acceptance.

References: https://imapflow.com/docs/api/imapflow-client/ ; https://nodemailer.com/smtp ; https://nodemailer.com/extras/mailparser ; https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0 ; https://learn.microsoft.com/en-us/graph/api/message-reply?view=graph-rest-1.0 .
