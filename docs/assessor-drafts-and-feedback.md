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

## Private content history — 28 October 2026 (source prepared; hosting pending)

Migration `20261028164935_private_marking_draft_snapshots.sql` extends the existing `uni_marking_draft_events` receipt log with bounded criterion, feedback and resubmission-guidance snapshots. The existing save RPC records the new draft and its snapshot in one transaction under the existing attempt lock and revision check. Failure to record the snapshot rolls back the entire save. A unique attempt/marker/revision index prevents duplicate save events. Anonymous access and browser insert/update/delete remain denied; owner, centre, assessor role and current allocation continue to govern reads. Reallocation hides the former assessor’s history, including its content.

Only the latest surviving draft is backfilled into its matching historical receipt. Earlier receipts retain NULL content: their wording cannot be reconstructed. This is explicitly shown in the history view. Future confirmed saves retain their saved wording; unsaved edits are never captured. Existing administrative data-retention/deletion arrangements still apply. This source change does not implement an administrative retention worker or automatic purge.

The allocated assessor can load history on demand even after marking closes, browse ten revisions per page and expand saved feedback, guidance and criterion reasoning. Account/centre/active-role/attempt changes clear displayed history and suppress late reads. Loading, schema/read failure, uncaptured wording and verified empty results have separate messages. Refreshing history does not discard editor changes. Viewing history cannot restore, edit or submit an older revision; a deliberate restore-as-new-draft workflow remains a later capability.

Draft save confirmation now requires the expected attempt, owner, centre, next revision, timestamp and unchanged content in the returned RPC row before clearing unsaved status. A rejected/uncertain receipt retains edits and blocks another save until the assessor explicitly reloads. Late responses after an account/role change cannot announce success in the new workspace.

This new migration has been checked with synthetic local PostgreSQL fixtures and full fresh-schema rehearsal. It has **not** been applied to the hosted database in this batch. Deploy it through the existing reviewed incremental migration process, run hosted security advisors and verify owner/centre/reallocation acceptance before claiming hosted history is available. Do not replay fresh-staging replacement migrations in production. Until the migration is applied, history reads fail explicitly while the existing draft-save API remains compatible.

## Restore saved wording as new work — 28 October 2026

A saved content revision can now be copied into the editor with **Use revision N in editor**, available only while the allocated attempt is markable, the latest draft has been checked, and no save or uncertain-save recovery is pending. Metadata-only entries remain read-only. The action confirms replacement of current/unsaved editor fields and checks every saved criterion against the current rubric, including point bounds and field sizes. Incompatible content leaves current edits unchanged. The normalized copy includes only criterion fields, feedback and guidance; it never imports the old revision token or alters the historical snapshot.

Confirmed copying creates unsaved local edits. It performs no RPC and does not submit marking. **Save private draft** remains a separate action and uses the latest loaded revision to append a new saved version. A concurrent save still produces the existing revision conflict, retaining restored wording until explicit reload; restoration cannot bypass that check. The history status distinguishes cancellation from copied-but-unsaved content and clears its prior copy notice when the saved revision changes.

No new schema, role grants or persistence endpoint are introduced. Hosted history still depends on the pending `20261028164935_private_marking_draft_snapshots.sql` migration and deployed acceptance from the preceding batch. Governed institution-shared feedback, persistent document annotations, provider activation and production device/store checks remain separate phases.

## Governed centre feedback catalogue — 28 October 2026 (source prepared)

The new centre catalogue is separate from private phrases. In the assessor marking editor, an assessor can propose immutable generic wording; a different centre IQA can approve the exact title/body from the QA workspace or withdraw proposed/approved wording. Both database roles must be current. Centre directors, students, lecturers and other roles gain no catalogue permission merely by being signed in. A person with both assessor and IQA roles still cannot approve their own proposal. A content change requires a new proposal; withdrawn records cannot be republished. The displayed revision tracks state transitions, not editable versions of the text.

Migration `20261028181047_centre_feedback_approval.sql` creates the catalogue and its append-only decision log with RLS and explicit authenticated SELECT grants only. Narrow RPCs derive author/centre from the signed-in identity, validate bounded fields, serialize review transitions, check the expected revision, require an internal review reference and record audit events atomically. Direct browser insert/update/delete and anonymous access are denied. Proposal request IDs permit an exact same-owner/centre/content retry after lost acknowledgement; another caller or changed wording cannot reuse the ID. Audit failure rolls back both proposal and review writes.

Assessors read approved centre phrases plus their own proposed/withdrawn records; IQA reads the centre review queue. Unapproved proposals from another assessor are hidden. Withdrawn records and audit history remain available only to the author and centre IQA. The UI loads a complete RLS-filtered snapshot on demand, searches/filter statuses, displays ten phrases per page and rechecks approval, revision and wording immediately before inserting into a local marking draft. An insertion is unsaved individual feedback, never a grade or final submission. Later withdrawal does not remove text already copied into drafts or submitted marks.

Account/centre/active-role remounts clear local catalogue state and suppress late responses. Uncertain mutation receipts retain wording/review references, disable further changes and require explicit reload. Proposal/approval/withdrawal success requires a matching receipt; no silent approval or automatic retry is used. Approval and withdrawal need confirmation. The database audit stores each decision/reference; the current UI displays the latest review reference. A dedicated audit-history browser, content replacements/lineage and proposal expiry remain later enhancements.

Verification uses synthetic PostgreSQL, component and three-account Chromium fixtures. The new migration has not been applied to the hosted backend. Production migration review, security-advisor output and centre sign-off on the assessor/IQA governance policy remain release gates. Local Supabase advisors cannot connect without a running local Supabase server; this is not reported as an advisor pass. No hosted records, real staff messages, student grades or provider configuration are changed by this source batch.
