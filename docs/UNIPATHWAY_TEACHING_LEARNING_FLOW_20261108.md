# UniPathway teaching and learning flow build

Date: 8 November 2026, Europe/London.

## Purpose

Continue the connected-journey work from PR #184 through the learner's lesson, class and coursework screens and the lecturer's class scheduler. The changes apply `DESIGN.md` to concrete state and navigation defects while retaining the existing visual tokens, role guards, database contracts and independent assessment process.

## Problems and resulting behaviour

| Flow | Observed source defect | Resulting behaviour |
| --- | --- | --- |
| Selected lesson | An unavailable explicit lesson ID fell back to another published lesson and the URL was rewritten. | The requested ID remains in the URL. The learner sees an unavailable state and deliberately chooses an available lesson or the module overview. |
| Coursework submission | A response with no error but no attempt UUID was treated as success and the draft was cleared. | A valid UUID receipt is required. The reviewed evidence and request key remain paired for uncertain retries; later edits are retained separately. |
| Submission recovery | A retry could reuse the request key with changed text or attachments, conflicting with the server's idempotency contract. | Retry sends the original reviewed payload. A scoped status check can recover a confirmed receipt; an empty or failed read does not establish that the earlier request failed. |
| Class scheduling | Learner selection remained actionable while candidates were unavailable; failure could appear as an empty enrolment list. | Dependent actions wait for verified candidates, with separate loading, failed and empty states and an explicit retry. |
| Calendar save and cancellation | Save did not verify its returned ID; cancellation relied on an empty success response. | Save requires the requested class UUID. Cancellation follows the existing void RPC with a scoped status readback before announcing success. |
| Class times | Device-local inputs conflicted with classroom listings in Pakistan time. | Inputs and displayed class times use Asia/Karachi. Stored instants remain UTC. |
| Agenda to classroom | The agenda carried only the module; a centre-wide 200-row cap could hide the requested class. | Navigation includes the exact session. Scoped paging and related-record reads preserve valid selections beyond unrelated centre records. |
| Archive recovery | Disabled release, unavailable access, read failure and empty records shared misleading states. | Each state has separate copy and recovery. Selected module/session context survives return navigation. Disabled release performs no private media reads or signing. |

## Contracts retained

`submit_unipathway_coursework` remains the submission authority. Its returned UUID identifies the committed attempt. Existing SQL compares a reused request key against the same brief, trimmed evidence and attachment IDs; the UI now preserves that reviewed version. The server continues to enforce active enrolment, cutoffs, attempt limits, attachment ownership and independent marking. No provisional score is exposed.

`save_uni_calendar_class` continues to return the requested class UUID. `cancel_uni_calendar_class` and `review_uni_calendar_delivery` retain their void return contracts. Application confirmation does not imply Microsoft invitation, meeting or cancellation delivery. Provider statuses remain separately visible.

Reads retain row-level security and explicit centre and record scope. Active role membership is checked before loading or mutating the affected workspaces, and late responses cannot populate another identity's workspace. No database migration, provider consent, hosted worker activation or release-feature enablement is part of this build.

## Review and regression evidence

Focused unit coverage exercises unavailable selections, scope changes, uncertain receipts, exact-payload retries, duplicate actions, Pakistan date handling, candidate failures and archive states. Browser acceptance uses synthetic identities and records at `unipathway-browser-ci.invalid`.

The four added browser journeys cover:

1. An unavailable explicit lesson, deliberate recovery, the next lesson and reload continuity.
2. Agenda-to-class selection beyond unrelated centre records, whiteboard failure recovery, the disabled archive and the return path.
3. Coursework with an empty receipt, a status check, later draft edits, an exact reviewed retry and a verified original response.
4. Scheduler loading and failed candidates, retry, an empty save receipt, Pakistan-time serialisation and cancellation readback.

The shared layout-evidence helper captures complete pages at 360, 390, 768 and 1440px, then repeats those widths in dark mode with a 32px root font and reduced motion. It checks document overflow, dashboard/header separation, mobile menu separation and minimum target size, and screenshot height. Confirmation dialogs receive additional bounded-layout checks. CI retains the previous connected-journey screenshots and these new screenshots in one artifact, including the archive's disabled-activation screen.

The integration unit run passed **1,204 tests across 227 files**, an increase of 85 cases from the previous merged build. TypeScript, repository lint, the application build, database rehearsals and edge checks also passed during integration. The final browser and release evidence is tracked in [PR #185](https://github.com/asaffilate01-ship-it/ascent-education-cloud/pull/185), including the retained `unipathway-ux-flow-browser-evidence` artifact for its current checked commit.

Rendered review identified issues beyond document-level overflow: enlarged mobile recovery controls split common words, some reading text inherited a fixed small size, the scheduler fieldset could extend beyond its card, and the mobile menu overlapped wrapped header actions. The follow-up changes cap narrow-screen nested padding, size reading text and headings in rem units, let mobile fields grow above their 16px minimum, constrain fieldsets and reserve space for the 44px menu control. An uncertain coursework attempt also now has an uncertainty badge instead of “Ready for submission.” These findings are covered by the repeated screenshot matrix before merge.

The scheduler review also found native calendar-picker icons using the light theme on dark input surfaces. Dashboard date and time controls now explicitly follow the selected colour scheme, keeping their native icons visible without replacing browser controls.

The root-font check measures enlarged-text reflow; it does not replace physical-device testing or certify every platform's browser zoom behavior. Native single-line selectors may abbreviate a long selected title; the complete current lesson title remains visible in its heading.

## Acceptance boundary

Synthetic tests and reviewed CI screenshots establish source behaviour for this build. They do not establish authenticated hosted deployment, real Microsoft delivery, live recording release, or lecturer and learner acceptance on physical devices. Those remain separate operational checks against the verified UniPathway environment.
