# Teams recording transfer and review

Source delivery adds a per-class transfer queue, Node worker, private review/release controls in the teaching desk and connected coordinator selection in scheduling. No hosted activation or Microsoft credentials are implied by this document.

## Workflow

1. Create a distinct Teams calendar meeting for each class. In UniPathway select its actual connected organiser (a coordinator is supported), module, times and meeting link. Assign lecturer co-organiser/presenter/breakout manager roles in Teams itself. Selecting an organiser here does not allocate Premium or change Microsoft permissions.
2. Record the class in Teams. After it ends, use Retrieve Teams recordings or run the worker with `--scan` to enqueue recently ended classes requesting recording.
3. The worker resolves the meeting under the mapped organiser, checks the returned organiser identity, paginates recordings, restricts recording timestamps to this class window and transfers MP4 content into private storage. It does not trust provider download URLs or expose Graph credentials.
4. The teaching desk shows transfer state. A manager previews the draft, confirms review, then separately releases it to invited learners. Withdrawal blocks new signed URLs; already issued links may last up to 120 seconds. Downloaded copies cannot be recalled.

## Server setup

Use Node 22+ on a trusted worker host with encrypted ephemeral disk (up to 2 GiB per recording), egress to Microsoft Graph/login and the project Storage endpoint. Install the repository dependencies with `npm ci --ignore-scripts` (the worker's pinned TUS dependency is in devDependencies). Do not run this in a browser or short-lived Edge Function.

Supply these secrets through the worker host's secret manager, never VITE variables or source control:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `UNIPATHWAY_TENANT_ID`: one UniPathway centre UUID per worker deployment
- `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`: the corresponding Microsoft tenant/app

The operator must verify the centre-to-Microsoft-tenant binding. Admin consent must grant application `OnlineMeetings.Read.All` for join-link resolution and `OnlineMeetingRecording.Read.All` for recording retrieval; apply the Microsoft application access policy only to approved organisers. Each organiser needs a trusted `microsoft_education_accounts` mapping with matching centre/user, Entra object ID and no disabled timestamp. Account provisioning and licence assignment are not performed by this worker.

Apply the forward migration only after inventorying the existing hosted schema; do not apply the fresh-staging replacement bundle over production. Ensure the private `unipathway-class-media` bucket and project upload quota permit the intended recording size (worker ceiling: 2 GiB). No bucket is made public. Storage quotas and retention must be configured by the operator.

Run `npm run worker:teams-recordings -- --scan` on a regular host scheduler. One invocation claims one job atomically; several worker processes may run concurrently. `--scan` adds up to 1,000 ended, recording-enabled classes in the configured centre from the last seven days (with a 30-minute processing grace). The unique session key prevents duplicate queue rows. Without `--scan`, only existing requests are processed.

Failed jobs are eligible after 15 minutes, up to eight attempts; manually requesting again after fixing the cause permits another attempt. Missing/not-yet-ready recordings are treated as retryable failures, never successful ingestion. A crashed worker's lease expires after two hours. Each process has a 45-minute transfer deadline. Supervisors should terminate hung processes after 50 minutes and clean abandoned `unipathway-recording-*` temporary directories after crashes. Sequential MP4 download is disk-streamed with a 2 GiB bound; upload uses 6 MiB TUS chunks and bounded retry delays. Failed uploads do not create playable artifacts. Stable artifact IDs make completed transfers idempotent and preserve human publication state. Orphan files from interrupted uploads stay private; operations should reconcile and remove unreferenced storage objects after investigation.

A successful job imports recordings visible during that pass. Request retrieval again if Microsoft produces an additional segment later. For recurring meetings, only recordings starting no earlier than 20 minutes before class and ending no later than 30 minutes after class are accepted; outside-window recordings require schedule correction and retry. Prefer distinct meeting links per class to avoid ambiguous overlapping sessions.

## Acceptance and remaining activation

Local synthetic database verification covers manager-only requests, organiser directory isolation, service-only claims, tenant boundaries, active leases, retries, draft storage privacy, approval/release transitions, stale updates, immutable review history, withdrawal and anonymous denial. Unit/UI tests cover pagination/URL rejection, recording time windows, approval before release, errors and learner controls. These do not certify Microsoft tenant configuration or hosted media transfer.

Before live rollout, run one real recorded meeting and verify download, draft review, invited-student playback and withdrawal. Then run four simultaneous meetings under one coordinator and the planned 24-class scenario. Verify all recordings/segments, Microsoft throttling, storage, notices, and capacity. Six coordinator licences are not a tenant acceptance result.

Still separate: transcript ingestion, Graph calendar-event creation, tenant-wide provisioning, automatic licence changes, retention deletion and Microsoft-side policy/theme activation. Breakout capture follows Teams behaviour and is not automatically included in the main recording. This worker does not provide covert listening or replace native Teams controls.

## References checked 24 October 2026

- https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-recordings?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/callrecording-get?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0
- https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- https://supabase.com/changelog/cbc-tls-ciphers-deprecated (use supported modern Node TLS; no legacy CBC configuration)
