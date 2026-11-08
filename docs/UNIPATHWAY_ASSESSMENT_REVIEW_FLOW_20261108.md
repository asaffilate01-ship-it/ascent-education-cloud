# Assessment drafting, publication review and independent marking

## Purpose

This phase completes the assessment handoffs identified after the connected finance and staff work. Programme managers previously saw only a summary before publication. Lecturer saves could complete after the user changed drafts, and the marker workspace treated an empty numeric RPC result as a confirmed mark. Those behaviours could hide unfinished work or detach a decision from the record the user reviewed.

The work extends the existing role-guarded routes, design tokens and assessment contracts. It introduces no migration or hosted service configuration.

## User journeys

### Lecturer drafts

The lecturer reviews the selected module, authored teaching details, assessment policy and Pakistan-time submission windows before saving an unpublished brief. The review freezes the payload and its client UUID. A returned record must match the reviewed payload; an uncertain response keeps that identity available for scoped readback before another insert.

Criterion wording is stored separately for each selected assessment. Moving from draft A to draft B does not transfer or discard A's unfinished criterion. Criterion review identifies the parent brief and every scoring field. A saved criterion uses the same receipt and recovery discipline as a brief.

Verified role, account, centre and module scope govern reads and writes. Rejected promises restore a usable state. Late responses cannot clear a newer form or announce success in another workspace.

### Publication and allocation

Management reads complete, centre-filtered and status-filtered queues. Related rubric rows, attempt briefs and allocations are fetched for those authorised records; the former 250-brief and 300-attempt limits cannot hide an older pending item.

A named publication review contains the complete authored brief, criterion descriptions and guidance, rubric total, version, deadlines, attempt allowance, penalties and policy reference. The independent allocation review identifies the submission, learner, teaching lecturer, assessor and IQA reviewer. A person cannot occupy a conflicting role in that allocation.

A directory failure offers recovery. A verified empty visible directory explains the visibility boundary and does not claim that no qualified staff exist elsewhere in the centre. The client does not widen `user_roles` access.

### Independent marking

Mark submission requires the numeric receipt defined by `record_unipathway_human_mark`. The client accepts finite numbers from 0 through 100, including zero. Missing, malformed and out-of-range receipts retain the attempt and private work, and block another mark submission until a fresh authorised status check resolves the uncertain outcome.

Mutations share a synchronous lock and are bound to the active workspace and selected attempt. A late mark, resubmission, AI request or private-draft completion cannot change another attempt or navigate another workspace. A confirmed mark goes to independent IQA review; it is not learner release.

## Contract map

| Operation | Existing contract | Confirmation and recovery |
| --- | --- | --- |
| Create assessment brief | Direct insert of an unpublished lecturer-owned row | Stable UUID, matching returned row, then scoped readback after uncertainty |
| Add criterion | Direct insert attached to a draft brief | Stable UUID and frozen criterion fields; scoped parent and row checks |
| Publish brief | `publish_unipathway_assessment_brief` returns `void` | An error-free RPC is valid; thrown/uncertain outcomes require a fresh publication check |
| Allocate assessor and IQA | `allocate_unipathway_independent_marker` returns `void` | An error-free RPC is valid; uncertain outcomes check the original allocation |
| Save private marking draft | `save_uni_marking_draft` returns the exact saved row | Preserve existing attempt, owner, centre, revision and content matching |
| Submit human mark | `record_unipathway_human_mark` returns `numeric` | Finite number in 0–100; uncertain receipt requires a fresh authorised attempt-status check |
| Request permitted resubmission | `request_unipathway_assessment_resubmission` returns `void` | Preserve the existing intentional void success contract and permission checks |

Authoritative definitions are in `supabase/migrations/20261026080443_assessment_live_activation.sql`, with private-draft row receipts in `supabase/migrations/20261028164935_private_marking_draft_snapshots.sql`. This phase does not alter them.

### Existing concurrency boundary

The publication RPC accepts only `p_brief`; it does not accept an expected content or rubric version. A fresh client preflight detects changes observed before the request, but cannot atomically prove that the published content is identical to the review snapshot if another authorised writer changes it immediately afterwards. Server-side publication still enforces its existing permissions, draft status, complete rubric total and future deadlines. An atomic compare of the reviewed content would require a separate server-contract change and corresponding database regression coverage.

## Design decisions

Use the existing forest/paper/navy palette, bundled Sora and Manrope, semantic state colours, and accessible components. The reference guidance already recorded in `DESIGN.md`—Taste Skill, Impeccable and Awesome DESIGN.md—supports clear hierarchy, contextual review and recovery. No new component framework or external visual identity is introduced.

Full references remain available, long text wraps, primary actions remain reachable, and confirmation dialogs are bounded by the viewport. Browser evidence covers 360, 390, 768 and 1440 pixels, light mode, dark mode with 200% text, and reduced motion.

## Verification record

Source verification covers 1,513 application cases across 234 files: the integration run passed 1,439 cases, and the affected marking rerun passed all 94 cases (74 new and 20 also covered by the integration run). The rerun followed correction of a parser error caught while the final recovery change was being integrated. The current source passes application typechecking and the production web build.

| Check | Source result |
| --- | --- |
| Lecturer drafting and recovery | 36 new cases passed |
| Management review and allocation | 31 new cases passed; 8 related existing cases also passed |
| Marking receipts, lifecycle and recovery | 74 new cases passed; 20 related existing cases also passed |
| Independent-assessment database rehearsal | 63 checks passed, including assessor/IQA separation, two-centre privacy and penalty handling |
| Repository lint | No errors; 665 warnings, compared with the preceding 666-warning baseline. Changed application code and new tests are clean |
| Browser suite discovery | Four new journeys discovered; included as a required Production CI step |

The pull request is the release record for the exact published revision, complete current-head CI results and inspected browser artifacts. Production CI runs the entire application suite again, plus the existing database, edge, worker, native-helper and browser gates. Native builds remain a separate gate. Merge requires successful current-head checks and actual inspection of the retained screenshots; source tests alone do not satisfy browser acceptance.

The four added browser journeys cover lecturer save recovery and per-brief criterion wording; a draft beyond the former 250-record limit and a submission beyond the former 300-record limit; failed versus empty visible staff directories; and an unconfirmed human mark followed by a verified zero-score submission to IQA. They use synthetic in-browser records, assert no unhandled page errors, and perform no hosted writes. Full-page evidence checks include the settled document height, while review dialogs are checked for viewport bounds and reachable final actions.

## Delivery boundary

PR #186 was verified and merged on 8 November 2026 at `90ed564dadf5e36d7057429e041702dc8b633bf5`, after its unchanged source revision passed Production CI and both native builds on an authorised retry of the dependency failures.

This assessment phase changes source behaviour and regression coverage only. It does not run a hosted migration, expand RLS, activate an external provider, send invitations, take payments, publish real assessments or release real marks. Synthetic acceptance does not establish hosted, instructor, learner or physical-device acceptance.

Existing routes remain `/lecturer/assessments`, `/lecturer/marking`, `/lecturer/gradebook`, `/programme/assessments`, `/director/assessment-management`, `/assessor` and `/assessor/queue`. Lecturer aliases continue to draft briefs; they do not grant summative marking authority.
