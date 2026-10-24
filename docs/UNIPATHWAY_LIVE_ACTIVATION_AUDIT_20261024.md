# Live activation audit — 24 October 2026

## Result

Source integration is not activation. The application was published on request while preserving subsequent merges through PR #57. No production schema, existing account, enrolment, payment or storage file was changed by this audit. Only the already implemented legacy classroom retirement function was deployed; its hosted endpoint now returns HTTP 410.

## A. Implemented and verified live

- Public homepage returned HTTP 200 and rendered without browser page errors after the publication request. This proves page availability, not the full authenticated feature set or byte-for-byte deployed source parity.
- `jaas-token` deployed from the retirement source and returned 410; it no longer issues legacy classroom tokens.
- Hosted `create-checkout` returned 503 because Stripe is unconfigured. No live payment was attempted.
- The existing four Storage buckets were inspected: avatars/resources public; submissions/kyc-documents private. The new private lesson/audio buckets are absent.

## B. Implemented but awaiting hosted installation or configuration

| Feature | Source evidence | Hosted gap |
|---|---|---|
| Invited Teams classes, archives, module materials | Invited classroom ACL migration and connected screens | `live_class_sessions`, invitations, artifacts, module materials and whiteboard foundations absent |
| Managed AWS labs | Gateway, scoped offering/run model, disabled configuration gates | Gateway endpoint returns 404; foundational tables and AWS configuration absent |
| Role/tenant hardening | Separate roles table and forward hardening migrations | New feature policies/helpers absent; existing legacy classroom reads are centre-wide, not invitation-scoped |
| Staging rehearsal | Guarded bootstrap and reviewed replacement inputs | No separately verified hosted staging target configured here; never apply replacements to Live |
| Dashboard/audio/admissions/payment repairs | Connected source and regression tests | Learner dashboard reports missing centre assignment; IELTS cannot open its workstation in this account state; hosted academic/admission/ledger foundations absent |
| Teams teaching desk and private assignments | Revision-checked plan RPCs and per-learner group filtering | Teaching-plan tables/RPCs and Microsoft organiser/account foundations absent |
| Recording retrieval/review/release/withdrawal | Private queue, worker, review RPC, UI | Queue/review/artifact tables, private class-media bucket, Microsoft setup and running worker absent |

Hosted migration history contains only four entries (20260813103749, 20260816114159, 20260929181505, 20260929181522), while the repository has 172 migration files. History alone is not a reliable replay list: the actual hosted schema was checked and contains legacy academic tables but lacks the newer feature foundations. Do not replay the whole repository.

## C. Not implemented or not supported here

- This Lovable app sandbox cannot host the persistent recording worker. No external hosting connector is connected.
- Guided audio is exercise playback, not live intercom, microphone monitoring or automated Teams breakout management.
- Saved pair/group plans do not create or control rooms inside Teams.
- The recording worker does not implement automatic calendar creation, licence assignment, transcript ingestion, retention deletion or tenant-wide Microsoft provisioning.
- Full manual-payment integrity, refunds, chargebacks and non-PKR invoice processing are not supplied by the invoice-success ledger.
- No 20-seat hardware, remote concurrency or real Microsoft recording capacity acceptance was performed.

## D. Administrator actions and configuration required

1. Confirm Live recovery evidence: newest UTC daily snapshot from **More → Database → Manage → Backups**, and preserve the current state with **More → Database → Manage → Settings → Export data**. Tools cannot inspect backup inventory. Snapshots and exports exclude Storage files; download needed files separately from **More → Storage**. A restore loses later writes and reverts schema as well as data. No restore is requested here.
2. Reconcile a forward-only production migration sequence against the actual hosted schema. Build missing Teams/academic foundations first, then invitation ACL/material privacy, role hardening, guided audio, teaching plans and recording lifecycle. Adapt Storage bucket creation to the Storage API, not repository INSERTs into storage.buckets. Ensure every new public table has explicit role grants before RLS/policies. No execution-ready production upgrade SQL was applied or certified in this audit; existing historical replacements are not safe production upgrades.
3. Microsoft administrator: provide tenant/application identifiers and a client secret through secure secret entry, grant application `OnlineMeetings.Read.All` and `OnlineMeetingRecording.Read.All`, approve admin consent and scope an application access policy to approved organisers. Supply enabled centre/user/Entra organiser mappings; verify licences, recording policies, notices, meeting links and presenter/co-organiser roles in Teams.
4. Worker host: trusted Node 22+ runtime, encrypted ephemeral disk allowing up to 2 GiB per recording, HTTPS egress to Microsoft login/Graph and the project's private Storage service. Install pinned dependencies and schedule `npm run worker:teams-recordings -- --scan`. Configure tenant binding, Microsoft credentials and a least-privilege server access design. The current worker expects a service-role key, which is not available to users on Lovable Cloud: an external deployment requires an authorised server-side bridge/redesign or a separately owned backend; do not ask the user to retrieve an unavailable key.
5. Worker supervision: 45-minute transfer deadline, terminate hung processes after 50 minutes, lease/retry monitoring and cleanup of abandoned temporary files. Configure private media quota and retention. New signed URLs stop after withdrawal; already issued links may remain valid for 120 seconds and downloaded media cannot be recalled.
6. Keep AWS disabled until region, centre binding, IAM credentials, AppStream fleet/stack, cost limits and real launch tests are ready. Keep Stripe disabled until isolated test credentials/webhook mode, ledger reconciliation and retry/duplicate/partial-payment tests pass. Missing secrets must use secure entry, never browser variables or source control.

## Verification performed

- Full Vitest suite: **100 files, 442 tests passed**.
- Offline fresh-schema rehearsal: **171 migrations passed**, one provider-extension migration deferred. Synthetic checks: identity/whiteboard 11, guardian 15, admissions 17, Stripe ledger 28, guided audio 22, Teams teaching 23, recording pipeline 31, operations/guardian/native 34. These do not prove hosted transport or real provider operation.
- Wiring audit: 43 functions inspected; 17 have literal frontend callers. A source caller is not deployment evidence.
- Authorised student session: `/student` and `/student/ielts` render but report missing centre assignment. `/live-classroom` reports missing `live_class_sessions` and `lesson_whiteboards` with hosted 404 responses. This is a failed acceptance gate, not an empty-state success.
- Full lecturer/student/parent/director/superadmin journeys and cross-centre denial were not certified. Only one hosted centre exists; no cross-centre fixture was added to production.
- Preview build log: OK. No manual build or typecheck was run.
- Security results are partly stale/incomplete, with informational public-bucket listing findings; no comprehensive clean-security claim is made.

## Remaining production gate

Backup/export evidence, forward schema reconciliation, Microsoft administrator setup and a deployable worker authentication solution must precede real invitation, audio, recording and withdrawal acceptance. Merged PRs and passing synthetic tests do not satisfy that gate.

### Updated instruction — 24 October, 16:11 UTC

The user deferred recovery confirmation and Microsoft setup. Neither is a blocker for preparing additive, forward-only database changes. The earlier audit remains historical evidence, not a claim that backups were verified. Recovery is still unverified, and no database activation occurred merely by changing this task status. Microsoft credentials, consent and organiser mappings remain required for actual Teams and recording-provider operation. Preserve private media, tenant permissions, existing data and disabled paid providers throughout preparation.