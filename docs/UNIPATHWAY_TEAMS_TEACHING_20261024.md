# UniPathway Teams teaching and branded delivery

Teams Enterprise/Education remains the only live classroom. No JaaS, Jitsi or new media-provider integration was added by this change. The unused legacy JaaS token endpoint now returns HTTP 410 instead of signing browser-supplied moderator claims; deploy that edge-function replacement to retire the hosted endpoint.

## Implemented source

- Every scheduled class links to `/classroom/teaching/:sessionId`, behind classroom role guards and server invitation checks.
- Authorised lecturers prepare one-to-one, pair or group plans, name groups, assign tasks, move learners and save activity instructions/duration. Maximum 50 groups/1,000 assigned learners is a planner limit, not a Teams capacity guarantee.
- Only active enrolled invitees can be assigned. Learners receive their own group name/task and common instructions, not classmates' IDs or the class roster. Revocation blocks new reads. Concurrent changes reject stale revisions.
- Plans are persistent preparation; live room creation/assignment happens in native Teams. The UI never reports a saved plan as executed media control.
- Native Teams teaching guidance covers visiting rooms, private support, class recall, requesting students to speak/present, shared system audio, Whiteboard, projection and individual headset stations.
- Existing private practice-audio controls are available for all subjects from this desk, not only IELTS. Saved class boards and existing question/hand-raise workflows are connected.
- Recording status comes from authorised artifact rows; unknown/missing/error is not reported as recorded. Published recordings remain in the private lesson archive.
- Microsoft setup is routed for centre directors/superadmins and reports saved brand/template/account records with explicit loading/error states and activation steps.
- Scheduling includes 20-, 30- and 50-seat classes and supports validated Microsoft meeting paths. It does not change Microsoft licences or provider capacity.

## White-label boundary

UniPathway branding applies to its portal and teaching workflow. Teams Premium supports branded meeting themes for appropriately licensed organisers; native Microsoft client/identity is not fully white-labelled. An ACS embedded client is a different integration with feature limits and is not introduced here. Full native Teams functions take priority under the user's instruction.

Sources checked 24 October 2026:
- https://support.microsoft.com/en-gb/teams/meetings/manage-breakout-rooms-in-microsoft-teams
- https://support.microsoft.com/en-us/teams/meetings/join-a-breakout-room-in-microsoft-teams
- https://support.microsoft.com/en-gb/teams/meetings/share-sound-from-your-computer-in-microsoft-teams-meetings-or-live-events
- https://learn.microsoft.com/en-us/microsoftteams/meeting-themes
- https://learn.microsoft.com/en-us/azure/communication-services/concepts/interop/guest/limitations

## Not activated or represented as complete

- Production Supabase access: Lovable query returned database inaccessible; direct Supabase connector returned permission denied for project `sthrhcmjypwuorlbscfw`. Do not run historical fresh-staging replacements against that existing production database. Reconcile its migration/object inventory and use a measured forward upgrade.
- Microsoft tenant consent, licence assignment, theme deployment, device acceptance and actual classroom tests require administrator access and are not verified by source tests.
- Automatic Graph meeting scheduling, recording retrieval/private transfer, transcription and attendance ingestion are not implemented by the teaching-plan change. Existing provider functions are scaffolds, not proof of those services.
- Native Teams recording must be observed in Teams. Main-room recording must not be treated as a recording of all private/group discussions. Announcements are text messages, not an audio broadcast across breakout rooms.
- No covert microphone activation, silent screen inspection, remote desktop takeover, universal simultaneous live capacity or external awarding-body approval is claimed.

## Acceptance before live use

Apply the new migration only on a compatible deployed schema. Check two tenants, assigned and unassigned lecturers, active/revoked/expired invitees, stale revisions, unassign/reassign, private roster protection and late responses after leaving. Verify 20 physical headset stations plus remote learners in Teams desktop/mobile, rejoining, invitation revocation, presenter changes, privacy notices, breakout timers, return to main, projector, Whiteboard and recording publication/access. Test actual provider capacities and network conditions independently.

## Verification

Local TypeScript, production build and full unit suite passed (409 tests before the final legacy-token regression). Fresh-schema rehearsal applied 167 migrations, with the unsupported provider-extension installation explicitly deferred, and passed 23 Teams-plan checks. This is offline schema validation, not hosted Microsoft/Auth/Storage acceptance. Final CI is required before merge.
