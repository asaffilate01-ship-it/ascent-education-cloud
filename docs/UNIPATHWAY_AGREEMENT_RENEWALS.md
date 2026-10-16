# Partner agreement renewals

The leadership Agreements tab now provides an expiry queue, organisation/reference search, state counts and 20-row navigation. Expired agreements appear first, followed by agreements expiring within 30 days, incomplete evidence, future agreements, current agreements and inactive records. Dates are interpreted as UTC calendar dates with an inclusive end date, matching the expected Supabase UTC database configuration.

Published pathway records without a current signed agreement in the loaded snapshot are highlighted. A current replacement agreement prevents an obsolete contract from generating an unnecessary pathway warning. This is an operational indication, not proof of partner authorisation: database gates also check relationship status and managed evidence availability.

Activation is disabled for expired, future, incomplete or unsigned agreements. Existing database constraints remain authoritative. Staff can register a replacement signed agreement using the existing private upload/reference form and refresh the queue. No renewal, provider contact or publication occurs automatically.

Agreement audit history is loaded on demand using explicit centre, agreement and entity-table filters with existing 20-event paging. The queue re-evaluates dates every 30 seconds and resets filters when its centre changes. Existing role guards and RLS apply.

Validation covers inclusive date boundaries, invalid/future/missing dates, terminated and open-ended contracts, replacement coverage, filtering, pagination and audit query scope. This increment introduces no migrations or live integration calls. Full staging/browser checks remain outstanding.
