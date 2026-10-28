# Saved assessor drafts and personal feedback — 26 October 2026

Assessors can now save unfinished criterion scores, evidence citations, feedback and resubmission guidance, then resume them after reload or on another signed-in device. Saving is explicit via **Save private draft**; it does not submit marking, notify learners or release grades. Existing human marking and independent IQA controls remain unchanged.

The editor checks for an existing draft before allowing changes. A failed read blocks editing instead of treating an unknown draft as empty. Save requests include the loaded revision. A newer saved revision produces a conflict, retaining local edits until the assessor explicitly reloads. Reload and switching submissions require confirmation if there are unsaved edits. The UI reports the saved revision/time. This is not automatic saving: users should save before navigating away.

The private feedback library supports creating, searching, inserting and deleting generic phrases. Phrases are private to the assessor and centre, not shared institutionally. No learner evidence or existing individual feedback is automatically copied into the library. Inserted wording must be adapted to the learner; existing bracket-placeholder checks and human judgement still apply. The private library loads complete owner/centre-filtered pages and presents ten matching phrases at a time; a managed institutional feedback catalogue remains a later phase.

## Permissions and storage

Migration `20261026173755_assessor_saved_drafts.sql` creates:
- `uni_marking_drafts`: assigned-marker read access, no direct browser writes. The narrow save RPC checks current allocation, assessor role, centre, markable attempt state, bounded field shape and matching rubric codes. The attempt lock serialises revisions with marking. Reallocation hides the former assessor's private draft; the new assessor gets their own draft rather than inheriting another person's decision.
- `uni_marking_draft_events`: append-only save receipts recording attempt, actor, centre, revision and time. These are save metadata, not full content-version snapshots or undo history.
- `uni_feedback_snippets`: own-assessor/centre select, insert and delete. Ownership transfer and direct updates are denied. Deleting a phrase does not change feedback already inserted into an individual draft or submitted mark.

All three tables have RLS; anonymous reads are denied. No new role grants. Saved drafts remain private after submission; further draft writes are rejected unless the assessment is again in a markable state. Account changes reset browser editing state. Existing records are retained; draft purge/retention policy remains an administrative follow-up.

## Verification

31 PostgreSQL fixture checks cover identity/centre isolation, stale revisions, incomplete drafts, malformed/foreign rubric fields, direct-write denial, immutable save receipts, closed attempts, reallocation, snippet ownership, deletion and anonymous permissions. Eleven workspace tests cover the prior marking workflow plus saved restoration, exact save revision, conflict retention and unavailable-draft blocking.

The browser integration uses a synthetic signed-in assessor/backend at 390px and 1440px. It verifies save → reload → restore, reusable phrase creation/insertion, another draft save, and final submission to the existing IQA RPC, with no horizontal overflow or page errors. TypeScript, production build and the full 197-migration schema rehearsal passed. Provider-owned extensions remain deferred in the synthetic rehearsal.

The exact migration passed a live rollback preflight and was transactionally deployed with its migration ledger entry. Production table/RLS/grant checks followed. No real student drafts, grades, emails or invitations were created. Real staff acceptance and frontend publishing are separate from these checks.

Still outstanding: PDF/DOCX inline annotation, shared approved feedback libraries, content-version history for drafts, full lab/media/provider activation and other integrations listed in the connection checklist.


## Private library reliability and navigation — 28 October 2026

The library now mounts within an account/centre/active-role boundary. Changing that boundary clears phrase search, list, unsaved wording, messages and operations; late responses from the old mount cannot clear another account's draft. Reads use complete, ordered 250-record requests, fail closed on any page error and render ten matching cards per page. Search includes older phrases, trims whitespace and has explicit empty/reset states with focus restoration and contextual counts.

Creating a phrase requires its returned id/title/body receipt before reporting success. An uncertain response retains wording, blocks further writes and requires explicit reload. The reloaded snapshot identifies exact title/wording duplicates; this is a client safeguard, not a database uniqueness or exactly-once guarantee. Generic new wording can still be edited while loading is unavailable. Refreshing the list does not discard it.

Deletion includes the displayed id plus owner and centre filters and requires exactly that returned id. Failed or zero-row deletion clears verified list state rather than claiming success. Inserted phrases are only local draft edits: insertion can decline (for example at the feedback length limit), and the library reports that outcome accurately. No phrase action submits marking or releases a result.

The existing RLS/role/grant model is unchanged; no migration or broader sharing is introduced. Shared institution-approved phrases, editing/version history and approval governance remain separate capabilities. Nine library tests cover paging, recovery, account/late-response isolation, mutation receipts, duplicate safeguards and disabled actions. The existing 31-check PostgreSQL permissions/concurrency fixture passes. A synthetic assessor browser journey checks older-phrase discovery, insert/create/delete, phone/landscape/desktop layout and zero human-mark submissions.
