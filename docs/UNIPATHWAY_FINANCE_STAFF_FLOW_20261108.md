# UniPathway finance and staff identity build

Date: 8 November 2026, Europe/London.

## Purpose

Continue the connected journeys after PR #185 through invoice creation, pending transfer evidence, learner fees and office permission review. This build applies `DESIGN.md` to existing source defects using the established Sora/Manrope typography, navy and paper tokens, component library and server contracts. The Taste Skill and Impeccable references inform readable task hierarchy, resilient forms and cross-width inspection; they do not replace the project's design or access authority.

## Problems and resulting behaviour

| Flow | Observed source defect | Resulting behaviour |
| --- | --- | --- |
| Invoice identity | Creation stored a display name without `student_id`, while the learner fee RPC filters by student identity. | Finance selects a same-centre account, verifies its student role, reviews the full account reference and creates a linked tuition, exam or deposit invoice. |
| Invoice confirmation | An insert without an error was treated as successful even without a returned invoice. | A matching record must confirm the reviewed student, centre, UUID, amount and terms. Uncertain creation retains that UUID and payload for scoped status checks and retries. |
| Transfer amounts | Zero could fall back to the full balance; negative, excessive and over-precise amounts were not consistently rejected. | Empty means the full student share. Explicit zero and invalid amounts are rejected. The original invoice and sponsor fields are checked again before writing. |
| Payment recovery | Form state could cross invoice selections and a retry could start another record. | Drafts and unresolved reviews stay with their invoice within the same authorised workspace. Recovery reads the original payment ID and retries the same payload; identity changes clear the local workspace. |
| Payment meaning | Staff checkout used the learner ownership endpoint, with a possible fallthrough to manual card-method recording. | Staff record supported transfer methods as pending evidence. Only the owner student opens card checkout. Neither a transfer reference nor a checkout return is settlement. |
| Invoice workspace | Short references, ambiguous totals, no pagination and limited recovery made related records harder to review. | Full IDs, two-decimal PKR amounts, student/sponsor shares, verified summary states, all-word search, clear filters and 20-row pages support the complete loaded set. Older unlinked invoices are explicitly flagged. |
| Learner fees | Active role/loading changes were absent from the workspace key; amounts rounded to whole rupees and status filtering lacked a reset action. | Verified active student access scopes the page, exact invoice IDs connect the journey, amounts retain two decimals and no-match recovery restores filter focus. |
| Staff permissions | Late permission reads could attach a previous person's revision and overrides to a new centre or selection. | Directory, person, centre, role and revision must match. A named review freezes the target and draft. A matching next-revision receipt confirms the update; uncertainty requires readback before another write. |
| Account operations | A historical management membership could authorise the UI while another role was active; a running batch could continue after a role change. | The active verified management role is required. History, file reads and each next batch operation stop when their original scope expires. |

## Data and workflow decisions

Finance account lookup reads only `user_id`, `full_name` and `tenant_id` from same-centre profiles with paging. The selected account is checked again with a scoped profile read and the existing authenticated `has_role` function. The interface says **student account**, not active enrolment: admission fees can precede course enrolment. It does not enumerate role rows or broaden access to student enrolments.

New student charges offer tuition, exam and deposit. Creating a commission invoice linked to a learner would make it appear as learner debt, so commission creation is directed to the existing university referral workflow. Existing commission records remain visible and separately labelled. Historical invoices without a student link require finance review; this build does not guess or bulk-repair identity from names.

Manual payments use a client UUID and `status: pending`. The UI checks the exact invoice, centre, student, student/sponsor split and status before insertion. Confirmation compares the complete returned pending record, including amount, method, transaction reference and optional details. It never updates `invoices.paid`. Verified payment processing and independent finance application retain their existing authority.

Legacy invoice and payment INSERT policies require a Finance Officer or Centre Director membership. The Platform Owner invoice view remains readable, but that role alone does not enable creation or transfer recording. The shared client guard follows those existing policies; a platform owner with an independently verified finance/director membership can use the existing writes. No role or server permission is broadened.

An uncertain invoice or payment is held in memory for the current account, centre and active role. Closing and reopening its dialog retains recovery; payment reviews also survive visiting another invoice and returning. Leaving that authorised workspace or reloading the application ends this in-memory recovery. The full reference is visible so staff can retain it for finance review. This is not a persistent offline transaction queue.

Invoice summaries cover loaded, non-refunded centre records. Student charges and their recorded payments exclude commission invoices. Commission totals are recorded amounts only. The pre-existing expense view keeps its previous receipt input separately; the new student-summary definition does not silently alter that view.

The report endpoint supports centre and status filters. On-screen name/reference search, type filters and pagination are deliberately described as screen filters. Export is blocked when the selected status group exceeds the endpoint's known 5,000-record limit; this prevents presenting that known truncated response as a complete export. This is not a new paged server export implementation.

## Validation and visual evidence

Focused regression coverage exercises account verification, invalid amounts, exact receipts, identity changes, late responses, duplicate actions, fixed-ID retry, draft recovery, staff revision conflicts and active-role batch cancellation. Repository typecheck, lint, unit tests and build remain required integration checks.

Six added Chromium journeys use synthetic identities and records at `unipathway-browser-ci.invalid`:

1. Failed account lookup, retry, student invoice review, lost response, recovery of the original ID and the same invoice in learner fees.
2. Invalid transfer amounts, reviewed pending payment, invoice switching, exact-payload retry and an unchanged invoice balance.
3. Failed finance reads, retry, pagination, term-order-independent search, filter reset and missing-account disclosure.
4. A late centre-A permission response arriving after centre-B selection, a named review and readback of an uncertain centre-B update.
5. Production-default office activation gating with no staff directory, permission or invitation operations.
6. A Platform Owner invoice review with readable totals and no unsupported invoice/payment write actions.

The finance, learner and staff pages are captured at 360, 390, 768 and 1440px, then at the same widths in dark mode with a 32px root font and reduced motion. Dialog checks inspect viewport containment, horizontal reflow and the final action's reachability; additional captures show the action area at 360px. The existing connected academic screenshot evidence is retained beside the new finance/staff subdirectory. The office flag is enabled only for the isolated staged-control test step, after a separate disabled-gate test.

Final test counts, the checked commit, CI conclusions and actual screenshot review are recorded in the pull request after integration. The local Chromium binary could report its version but could not launch because the execution environment denied its process socket; real rendered review therefore uses retained GitHub Actions Chromium evidence.

## Follow-up defects retained for a separate build

- Assessment managers need the complete teaching summary, learning outcomes, evidence and rubric descriptions before publication; existing pre-filter row caps can hide older relevant briefs or attempts.
- Lecturer assessment drafts need exact-target async guards, and the independent marker queue needs to validate its numeric mark receipt. Publication, allocation and revision-review RPCs that intentionally return void should keep that contract.
- The account invitation gateway's allowed roles and invitation-history table differ from the account-operations UI. Staged invitation completion SQL also needs reconciliation with the existing function return type. This batch does not broaden invitation roles or activate invitations.
- `AddStaffModal` still needs its own pending-session and stale-response audit.
- The existing expense workspace needs a separate explicit centre-query and reported-profit audit. The invoice improvements do not certify that broader accounting workflow.

## Acceptance boundary

No database migration, hosted provider configuration, live payment, invitation dispatch, release flag or production environment setting is changed by this build. The source and synthetic checks do not establish authenticated hosted operation, live Stripe acceptance, real-centre staff acceptance or physical-device acceptance. Those checks must use the verified UniPathway environment and their existing operational release process.
