# UniPathway — robust academic admission receipts and recovery

## Problem
The admissions handover UI treated any non-empty RPC response as a successful academic enrolment. A malformed acknowledgement, an interrupted network call, or duplicate clicks could cause the UI to claim that learner access was granted without a confirmed transaction receipt.

## Source changes
- Validate the verified account/programme lists from the existing role-authorised server RPC before enabling a choice.
- Send the exact application, selected learner, selected programme, expected stage and evidence note to `complete_unipathway_admission` exactly once while pending.
- Only treat a **valid UUID enrolment ID** returned by the existing transactional RPC as a successful receipt. Never accept `{success: true}`, arbitrary strings, empty objects or missing data.
- After an uncertain or failed submission, retain the review draft, disable repeating the mutation and provide a read-only `Check recorded enrolment status` action. The status lookup filters the exact application, learner, programme and centre and accepts only one verifiably active matching result. It does not create or modify a second enrolment.
- The confirmation message now says that an enrolment **receipt** has been verified, not that Teams invitations, finances or all course access are already active.

## Security and limitations
This is a client-side recovery and truthful-confirmation improvement **on top of** the existing transactional server RPC. It is **not** evidence that identity, signed offers, fee settlement, awarding-body authorisation or independent admission conditions have been checked by the backend. Those require a separately reviewed source-of-truth and forward-only migration with RLS/role tests before hosted activation.

No production account changes or database writes were executed by this source development task. Synthetic tests cover success, rejection, malformed options, malformed receipts, exact-scope recovery and prevention of repeated submissions.
