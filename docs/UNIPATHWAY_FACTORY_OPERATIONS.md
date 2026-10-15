# Factory delivery visibility and intelligence reliability

## Delivery monitor

Directors and superadmins can inspect their centre's complete paginated outbox snapshot, displayed 20 events at a time. Queries select delivery metadata only: no event payload, student ID, source record content, credentials or lease token is fetched by this panel.

The monitor separates events awaiting local processing, ready for delivery, held by an active worker lease, waiting for retry backoff, accepted by Factory and requiring operator attention. Its classification follows the existing worker's two-minute leases and ten-attempt cap. An active tenth attempt remains in progress until its lease expires; the interface does not offer an override to bypass attempt limits. It shows event type/ID, attempt count, creation/local-processing dates, retry or lease time, last delivery error and recorded Factory receipt.

The existing manual batch controls remain. Page load does not invoke either processor. A synchronous in-flight guard prevents duplicate clicks, and changing centre invalidates pending reads and suppresses results from an old-centre operation. A failed queue read disables processing until a successful refresh. An already-started request may finish for its original authorised centre after navigating away; the UI does not claim to cancel it.

Response counters are validated before success is shown. The known dispatch endpoint's 409 configuration response distinguishes successful local processing from missing Factory connection credentials. Other uncertain delivery errors advise refreshing because some events may have been received before an error. Only a recorded receipt means accepted; it never means the intelligence job completed. The monitor is a snapshot and is not a scheduler, live provider connection test or job-completion poller.

## Intelligence records

The education intelligence page now requires centre-management access, keys state by signed-in identity and centre, explicitly scopes each query, reads all result pages and fails closed on a partial load. Empty datasets are distinguished from failed requests. Both student and course lists have navigation beyond the first twenty rows.

Recorded student IDs, review state and calculation dates are shown alongside available metrics. Missing values are displayed as unavailable. Stored risk scores are presented as recorded values rather than labelling a learner with no metric inputs as on track. Event ingestion and Factory acceptance do not claim to calculate or update these stored snapshots.

## Validation and release

Tests cover delivery classifications and retry limits, counter validation, metadata projection, missing-credential feedback, duplicate clicks, failed reads, old-centre operation results, learner access denial and intelligence loading/provenance. No new migration is required in this increment; previous outbox, support and knowledge migrations remain prerequisites.

Live configuration, credentials, scheduler setup, job-completion reconciliation, complete staging migration replay and real authenticated browser journeys are still outstanding. No production migration, live dispatch or deployment was performed during this implementation.
