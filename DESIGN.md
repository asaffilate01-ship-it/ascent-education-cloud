# UniPathway design authority

## Core identity
Keep existing light-mode forest/paper and navy HSL token family from src/index.css (foreground/primary 218 69% 23%) with dark-mode tokens; bundled Sora for editorial headings and Manrope for UI, rather than external font substitutions.

## Intent and information hierarchy
- Audience: Pakistan-based learners and parents, admissions agents, tutors, lecturers, centre administrators, employers and international partners.
- Main goal: Education admissions, qualifications, tuition, pathways, language learning, LMS and employer placement journeys.
- UX priority: Separate public marketing from role-guarded dashboards. Disclose course levels and entry requirements, fees and funding conditions clearly. Follow year-group/Level 3 through higher qualification progression, inclusive Pakistan imagery, no fabricated employer endorsements, and clear assessment outcomes. Make forms usable on affordable Android devices.

## Cross-surface craft floor
- Preserve public routes, role boundaries, permissions, data provenance and required information fields. Behaviour or data-meaning changes need dedicated regression tests, separate deployment approval and a traceable review.
- Make primary actions and current status unmistakable: title, summary, clear navigation, contextual help, inline errors, and recovery actions.
- Design for 360, 390, 768 and 1440px widths, 200% zoom, keyboard focus, reduced motion and light/dark themes. Review real rendered screenshots before approval.
- No fabricated data, legal claims, approvals, production statuses or human testimonials. No custom motion that interferes with essential tasks or screen readers.
- Keep existing component library, CSS tokens, typography and domain-specific state colours. Use copy and layout to reinforce meaning rather than replacing it with colourful charts.

## Design skills used
- [Taste Skill](https://github.com/Leonxlnx/taste-skill): brief-led layout, typography, art direction, cross-width inspection; adapt motion and density to task.
- [Impeccable](https://github.com/pbakaus/impeccable): `critique` > `audit` > `harden` > `polish` each high-impact flow, plus `npx --yes impeccable@4.8.0 detect src/` for an initial **advisory** quality baseline.
- [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md): design-document structure and tokens as reference; no third-party visual identity or trademark copying.

## Release quality gate
Existing lint/build/test jobs remain required; detector results are non-blocking until reviewed. On affected pages, verify accessible labels, keyboard and screen reader operation, long text, empty/failed/loading/offline/unauthorised states, print/PDF output where applicable, and responsive navigation. Record what was inspected and what could not be tested.

## Task-led app screens — centre intelligence and service discovery (31 October 2026)
- Treat a staff dashboard as a workspace, not a marketing page. A single readable heading, source/evidence boundaries, four or fewer actionable operational indicators and a short linked review queue are preferable to invented predictive graphs.
- For every summary distinguish **loading**, **verified data**, **no source records**, **failed query** and **access denied**. Never convert an incomplete read to a reassuring zero.
- Show decisions in the system of record: link to attendance corrections, assessment management and authorised programme scheduling. A count is not an endorsement, grade or automatic learner intervention.
- Use existing navy, green and paper neutrals, Sora/Manrope, consistent 44px tap targets, visible keyboard focus and text that wraps at 360px. Avoid tinted icon tiles, exaggerated glows, unnecessary animations and decorative AI badges.
- The role-service directory uses term-order-independent local matching, inline recovery and a / focus shortcut. No role-specific search query is transmitted to an analytics or AI provider.
- Study tutor visibility follows the *active authorised student role*, not merely the presence of an authenticated session. Conversational advice remains non-binding; expose privacy guidance and allow chat clearing.
- Inspiration from Taste Skill (app-screen rules), Impeccable (critique/harden/adapt) and Awesome DESIGN.md (documented consistent tokens) is applied as guidance; do not copy other brands' identity or install unreviewed executables.
- Never claim that source build, unit tests or synthetic browser fixtures prove authenticated production use, hosted deployments or instructor/guardian acceptance.

## Connected journeys — calendar, admissions and learning (7 November 2026)
- Keep the selected record visible while people move between related tasks. Admissions review sections carry the verified application ID and pipeline filters; an unavailable or foreign-centre ID must never select another application silently. Only routes that consume this context receive it.
- Give mobile record cards the same direct review actions as desktop rows. Label each action with its task and applicant; a pipeline stage is navigation context, not proof that eligibility, acceptance, payment or enrolment has been approved.
- Default the calendar to an agenda on small screens and retain the month view for scanning dates. Every day and event must open keyboard-accessible details, including all events hidden behind a “more” count. Show the event type in text as well as colour.
- Label calendar dates and inputs as Pakistan time (Asia/Karachi). Distinguish all-day dates from timed events. Validate start/end order, keep form entries after failure, block duplicate pending submissions, and announce success only after a confirmed returned record. Destructive event actions need a named confirmation and a recoverable error state.
- A “Resume lesson” action must resolve to an authorised published lesson and the current student's saved progress. Respect lesson revisions, active enrolments and centre/role changes. Use distinct start, resume, next, updated and review labels; label module fallbacks explicitly. Describe server-saved progress as synced so offline work is not misrepresented.
- Put released assessment titles and approved-feedback links beside released results when authorised metadata is available. Continue to use released results and corrections as the score source; missing metadata must never expose draft marking.
- Public learning discovery and role-service discovery use the same small local term matcher. All search words must match regardless of their order; subject filters remain in effect. Reset actions restore keyboard focus to the search input.
- Add regression coverage for context loss, failed and unconfirmed writes, stale responses, revision changes and withheld access. Retain synthetic browser screenshots at 360, 390, 768 and 1440px, plus dark mode and 200% text reflow, as review evidence. These checks do not certify a hosted deployment or replace real-device acceptance.

## Connected teaching and coursework (8 November 2026)
- An explicit lesson or class link represents a specific requested record. Preserve its identity, show an unavailable state when it cannot be verified, and offer an explicit route back to available lessons or classes. Never silently substitute a different lesson or session.
- Apply centre, module and selected-record filters before paging authorised records. Read related whiteboards, delivery jobs and invitations only for the returned sessions. A failed related read must remain distinguishable from a verified absence.
- Keep the selected class and module through agenda, classroom and archive navigation. Recordings awaiting activation, denied access, failed reads, empty archives and filter no-match states each need accurate copy and an appropriate recovery. A disabled release feature must not load or sign private media.
- Coursework confirmation names the assessment and shows the reviewed attempt, text and attachment count. Keep the reviewed payload and request identity together after an uncertain outcome. A retry resends that version; later draft edits survive and are clearly labelled as unsent. Only a valid submission receipt permits a success state, and human marking and release remain separate.
- Scheduling must wait for a verified learner and organiser lookup. Keep loading, failed lookup and verified empty lists distinct; allow retry without losing class details. Enter and display class times in Pakistan time. A saved class confirms the application record; Microsoft invitation delivery has its own status.
- Confirm cancellation in a named, keyboard-accessible dialog. Check the resulting class status before announcing cancellation, retain errors in the dialog, and return focus to the originating action or class list. Scope late mutations to the same user, centre, role and module.
- Let lesson navigation, coursework instructions and scheduling fields wrap according to the available text space. Confirmation dialogs need viewport-bounded width and vertical scrolling at 360px with enlarged text. Reuse full-page screenshot checks that verify the captured image includes the complete settled document.
- Enlarged text needs usable line width inside nested cards. Cap narrow-screen horizontal padding so common action words remain readable, use rem-based sizes for reading text and headings, and allow mobile fields to grow above their 16px minimum. Keep the mobile menu at least 44px square and clear of wrapped header actions.

## Connected finance and staff identity (8 November 2026)

- A student invoice must name a verified same-centre student account as well as a display name. Show the account reference during review and the full invoice reference in staff and learner views. A matching name is insufficient to repair an older unlinked invoice.
- Student charges comprise tuition, exam and deposit invoices. Keep commission records in their separate workflow and distinguish recorded invoice amounts from earned or payable commission. Finance summaries must state their included records and distinguish failed verification from a zero balance.
- Review a positive PKR amount with at most two decimal places before writing. Student payment limits use the original invoice and sponsor allocation; sponsor funding must not be subtracted twice. A transfer reference creates pending evidence and does not settle an invoice.
- Reflect the existing write policy in the interface: a Platform Owner can review invoices, but invoice/payment creation still requires verified Finance Officer or Centre Director membership. Do not imply that a broad management label inherits every legacy finance permission.
- Pair each reviewed invoice or payment with its client UUID and immutable payload. Only a matching returned record or scoped readback permits confirmation. Preserve uncertain recovery on dialog close and invoice switching within the same authorised workspace; a retry checks and reuses the original reference. Explain that leaving that account, centre or role ends the local recovery session.
- Card checkout belongs to the student who owns the invoice. Staff transfer recording has no card-checkout fallback. A checkout return page is not payment confirmation.
- Permission review names the exact person, office role, centre and last verified revision. A late read must never populate a newly selected identity. Freeze the reviewed selection while applying a change; uncertain results require a new verified read before another write. Account batch work stops when the active authorised management role changes.
- Staged office permission and invitation flags remain independent. Synthetic tests may enable an office flag only in their isolated test process; retain separate browser evidence that production defaults show an activation gate and perform no staff reads or writes.
- Keep finance searches, status/type filters, empty states and pagination usable at 360px and with enlarged text. The CSV export must say which filters it actually supports and disclose its known record limit. Forms and confirmations must scroll within the viewport, retain readable labels and return keyboard focus.

## Assessment drafting, review and independent marking (8 November 2026)

- A publication decision needs the full authored teaching summary, learning outcomes, expectations, required evidence, every criterion and its scoring guidance, submission windows and approved policy. Name the assessment and show its full reference in the review. A rubric total alone is insufficient context for approval.
- Filter the authorised centre and requested brief/submission status before paging. Read complete related rubrics and allocations for the returned records. A submitted attempt can reference a published brief outside the current draft filter; resolve that brief explicitly instead of losing its title or allowing an allocation without verified teaching identity.
- Distinguish an unavailable staff-directory read from no visible authorised staff. Role-scoped visibility cannot establish that a centre has no assessors or IQA reviewers. Keep the lecturer, learner, independent assessor and IQA identities separate without expanding access policies.
- An unpublished brief and each criterion have a named review, a stable request UUID and a frozen payload. Confirm the saved record against that payload. Retain uncertain saves and check the original reference before retrying. Keep unsaved criterion wording with its assessment when users switch between drafts.
- Display and enter assessment deadlines in Pakistan time. Validate the module, date order, attempt limits and finite point values before review. Freeze fields and identity during a write, restore usable recovery after failures, and ignore completions from an expired account, centre, active role, module or selected attempt.
- Respect the specific server contract: publication, allocation and resubmission intentionally return void; human marking returns a finite numeric score from 0 to 100. Zero is valid. An absent or malformed marking receipt must retain the selected attempt and private work, and require a fresh authorised status check before another submission.
- A mark submitted to IQA is private and provisional. Never imply that it has been approved or released to the learner. Private draft receipts remain separate from marking receipts, and AI analysis remains optional advice.
- Retain full references and accessible names in narrow layouts. Named review dialogs must scroll within the viewport and keep their final actions reachable at 360/390/768/1440 widths and 200% text size. Capture and inspect the rendered states before acceptance.
- Size assessment workspace text and portaled reviews in rem units so headings and record values enlarge along with their labels. Wrap the marking queue and evidence controls according to available reading space. Keep confirmed management updates inline and available after closing the review, so a floating success message cannot cover the next review's actions.
