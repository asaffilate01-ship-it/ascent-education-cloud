# UniPathway UI/UX and delivery plan — 28 October 2026

## Scope and evidence

Reviewed main at `37aa368`, AGENTS.md, current semantic tokens, DashboardLayout, package.json, roadmap.md, native readiness, live activation audit and Close-to-Live Gate. This is source review; historical hosted failures are leads to recheck, not proof of today's hosted state.

Design reference: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. Its searchable design guidance covers web/mobile stacks, tokens, accessibility and responsive interaction. It does not activate providers, repair business logic automatically or certify production. No third-party skill or installer was installed by this change.

Preserve bundled Sora/Manrope, navy/green/red branding, existing semantic tokens, role guards, Pakistan residence constraints and approved imagery rules. Reuse existing components rather than introduce another theme system.

## First implementation batch

- Darken light-theme success and warning text so status labels are readable on white cards.
- Use a light success colour with dark foreground in dark mode; correct primary and warning filled-surface text contrast.
- Apply the existing 16px mobile form rule to shared account dialogs and navigation, beyond public-main/dashboard scopes.
- Add computed WCAG AA contrast checks for the affected semantic pairs in both themes. These checks do not certify every component, opacity combination or image overlay.

## Delivery sequence

| Phase | Work | Acceptance evidence |
| --- | --- | --- |
| 1: Current baseline | Recheck public homepage, study, academy, blog and enquiry journeys; inventory routes, loading/error/empty states and failed requests | Actual desktop/mobile results, route and defect list; distinguish missing data from failed requests |
| 2: Shared UX | Audit token usage, navigation, keyboard focus, status badges on tinted surfaces, long tables, dialogs, 44px controls and reduced motion | Keyboard and narrow-screen acceptance; measured contrast on rendered surfaces; no clipped primary actions |
| 3: Hosted learning | Compare actual migration history/schema to source; prepare additive forward-only changes; verify learner, lecturer, assessor, IQA and guardian flows | Authorised test-account role/tenant denial checks, private file access, enrolment, submission, marking and release tests |
| 4: SaaS operations | Verify centre onboarding, tenant domains/themes, staff invitation/permissions, subscription entitlement, finance and agent commission workflows | Two isolated tenant fixtures in staging; server-side authorisation, persistence and reconciliation tests |
| 5: External services | Resolve Teams/recording worker authentication and approved organisers; test payment webhooks and refunds; lab lifecycle and cost limits | Real provider receipts, retry/duplicate/failure tests, private recording withdrawal, usage/termination evidence |
| 6: Native release | Device authentication/recovery/deep links, uploads, offline/reconnect, push opt-in/revocation, signing and store readiness | Physical Android/iOS results, signed internal/TestFlight releases, privacy disclosures and account deletion checks |
| 7: Pilot and scale | Pilot cohort, accessibility review, backup/restore evidence, monitoring and representative load | Owned launch checklist, recorded pilot outcomes and incident/recovery exercise |

## Gaps requiring current confirmation

- Earlier live audit documented missing hosted classroom foundations and centre assignment failures. Recheck before calling either resolved.
- Production migration execution and recovery remain separate from preparing SQL. Never replay fresh-staging replacement migrations into Live.
- Use UniPathway's existing backend; never substitute another brand's database.
- Microsoft consent, organiser mappings and external worker authentication need deployment evidence. Do not ask for an unavailable Lovable service-role key.
- Native projects exist; debug/simulator artifacts do not establish signed store readiness. Push credentials and physical receipt/revocation remain gates.
- Keep paid AWS and payment activation disabled until configured and accepted. Passing web builds do not prove payments or cloud-lab operations.
- Turnstile, real contact details, blog preview diagnosis and external integrations remain items in roadmap.md; confirm current state rather than invent values.
- Preserve the intended XpertJobs/Skilled Worker employer links, Ilmvero partner-school integration and Omniqora advisory role when planning later integration work.

## Working rule

Track each item as source implemented, locally checked, hosted checked, or provider accepted. A merged PR alone cannot move an item to the last two states. Each release batch should name changed files, checks run, remaining failures and external dependencies.


## Phase 2 implementation — shared navigation, account forms and operations guide

UI UX Pro Max was read from `.claude/skills/ui-ux-pro-max/SKILL.md` in the upstream repository. Targeted searches returned verified guidance for empty-state recovery, contextual live status counts, semantic controls and keyboard focus management. The React/Tailwind results mention newer framework versions; this implementation retains the project's React 18/Tailwind 3 APIs and existing components. No global installer or new dependency was used.

- Public desktop and mobile menus return focus to their own trigger on Escape. Empty mobile course searches have one explicit clear action which returns focus to the search field.
- Sign-in and registration inputs now have associated visible labels, password-manager autocomplete metadata and named, pressed-state password visibility controls with 44px targets. Existing authentication and role behaviour is retained.
- Registration no longer asserts unconditional awarding-body accreditation; centre approval remains conditional.
- The SaaS connection guide searches names, boundaries and next steps; combines search with recorded implementation status; announces a contextual count; and provides a clear empty-state reset. Filters change only the displayed guide, never recorded integration health.
- Tinted status badges have computed AA coverage. Primary/success/destructive colours were adjusted where the actual composed surfaces failed. Gradient panels have their own foreground token and darker endpoints, preserving readable text independently of filled primary buttons.

Next delivery work remains hosted acceptance and provider activation as listed above. No production database migration, paid provider activation, push delivery, store signing or real-device certification is implied by this source change.


## Next implemented batch — assessment evidence and role-service discovery

- Add local source-text and current-PDF-page search with line counts, keyboard navigation and a clear path back to the full source. No evidence is sent to a search provider or stored on the device.
- Keep search, line selection, criterion citation, draft save and final human marking as separate actions. Correct the false success message when an assessor declines replacement.
- Preserve PDF search through zoom and clear it at the page boundary; do not imply scanned pages are searchable.
- Add service-area filters and contextual counts to the shared student/staff/SaaS workspace directory, retaining role remounts and supported module links.

The next substantial assessment capabilities remain geometric PDF annotations, controlled DOCX rendering, multiple independently editable annotation threads and institution-approved shared feedback. They require their own persistence, access-control and acceptance design; this batch does not pretend to supply them. Hosted learning, tenant acceptance and provider gates above remain open until tested with authorised deployed accounts.


## DOCX review phase

The next source gap now has a bounded main-document DOCX text view: local paragraph/table references, search, clear loading/fallback states and no external viewer. UI UX Pro Max's document-preview recovery guidance informs the controls. This completes searchable text review only; full Word layout rendering, geometric annotations, multi-thread comments and institution-approved shared feedback remain separate work. The hosted/provider/device release gates above are unchanged.


## Private feedback workflow fixes

Complete paging replaces the former 200-phrase search ceiling. Account/centre/role remounts isolate unsaved wording and late responses. Confirmed mutation receipts, explicit recovery after uncertain writes, exact-duplicate detection after reload, scoped deletion and insertion-result feedback close identified source gaps. UI UX Pro Max guidance informs pagination, contextual counts and no-result recovery. The original Supabase permissions remain unchanged; institution-shared approved feedback still needs a separate governance and persistence phase.

## Evidence search navigation polish

Search now highlights literal occurrences with the existing primary/foreground theme pair, preserves original case and Unicode text, and reveals initial/subsequent matching lines inside the evidence pane without moving keyboard focus or scrolling the outer page. The source pane has a keyboard focus target with a visible ring so read-only reviewers can scroll through all lines. Counts remain matching-line counts; selecting a citation remains a separate action. This applies to submitted text, bounded DOCX extraction and current-page PDF extraction. UI UX Pro Max's targeted search recovery and keyboard-focus results informed this batch; word highlighting is a project-specific implementation choice. No new persistence, schema or provider activation is included.

Next substantial phases remain institution-approved shared feedback with governance/versioning, saved-draft content history, and persistent document annotations. Hosted tenant acceptance, Microsoft provisioning, production signing and physical-device checks remain release gates rather than inferred successes from source CI.

## Private saved-draft content history phase

The existing save-receipt log now has a prepared incremental migration for atomic, owner-only content snapshots. A read-only history view supplies on-demand loading, ten-revision pagination, expandable wording and explicit uncaptured-history/failure states. UI UX Pro Max's loading/disclosure guidance informed the controls. Save receipts now verify identity, expected revision and content, retaining edits on uncertainty. Full-content restore, governed institution-shared feedback and persistent document annotations remain next phases.

Status: source implementation and synthetic checks only. New migration deployment, hosted security-advisor results, real assessor acceptance and production publishing are not established by merging this batch. Existing provider, production signing and physical-device release gates remain open.

## Restore-as-new-draft phase

Historical wording can be copied into an eligible assessor editor after confirmation and validation against the current rubric. Saving remains explicit and advances the latest loaded revision, preserving immutable older snapshots and stale-save conflicts. Cancelled, incompatible, metadata-only, closed-attempt, busy and uncertain-save cases do not replace content. UI UX Pro Max confirmation/feedback guidance informed the separate action and unsaved-status message. This is a source-only addition to the preceding history phase; its hosted migration and acceptance are still pending. Shared approved feedback and persistent annotations remain next capabilities.

## Centre shared-feedback approval phase

Source now includes a separate generic centre catalogue: assessor proposal, independent IQA approval, revision-bound withdrawal, immutable wording, atomic decision auditing and exact-request idempotency. No self-approval or cross-centre sharing is allowed. The assessor insertion action rechecks approval before copying text into unsaved feedback. UI UX Pro Max confirmation/status guidance informs explicit proposal, review and insertion outcomes. Full paging, search, ten-row presentation and account/role isolation follow the existing library patterns.

The new incremental migration is prepared and synthetically checked, not deployed. Hosted security advisors and institutional acceptance of the role policy remain prerequisites to calling the catalogue live. The audit-history viewer is covered in the following phase; subsequent source capabilities include content replacement lineage and expiry; persistent document annotations and existing provider/device gates remain separate gaps.

## Centre-feedback audit viewing phase

The recorded centre-feedback decisions now have a read-only UI with on-demand loading, five-event pagination, explicit actor/time/reference details and clear separation of historical approval from current insertion permission. Scope filters, existing RLS, account/role/phrase remounts, stale-response guards and strict read validation preserve the catalogue boundary. UI UX Pro Max disclosure/loading guidance informed busy, empty and recovery states. No schema or access grant is changed. Hosted catalogue migration/acceptance remains pending; replacement lineage, expiry and persistent annotations are subsequent gaps.

## Course discovery across public site and student app

Public qualification filters now restore body, subject and search from the URL. Each change preserves unrelated query context and the page fragment, avoiding a scroll reset when filtering from a page-contents anchor. Body/subject changes create navigable history entries; live search refines the current entry with replacement, avoiding one Back step per keystroke. Reset removes only these three filter keys and returns focus to the labelled search. Invalid body/subject values fall back to the full catalogue, externally supplied search text is bounded, and clear no-result recovery/counts are available. Existing programme-approval caveats and confirmed-offer checks are unchanged.

The routed student **My courses** page now scopes programme/module queries to current-centre active enrolment IDs, searches course/body or module title/code, displays five courses and six modules per course page, and preserves module identity in learning links. A failed read shows a retry action, not an empty-enrolment claim. Search resets across account/centre/active-role changes; filtering does not change enrolment or turn archived modules into achievement. The older standalone CourseMarketplace component is not routed and was not presented as a delivered feature.

The shared dashboard hook now uses the Supabase SDK's `in()` method for array membership. Previously the raw `filter()` path encoded arrays as comma-separated strings without PostgREST parentheses. An actual-client request test verifies the encoded URL; empty membership sets return no rows without a request and malformed membership input fails closed. Existing equality filters, paging, RLS and stale-response guards remain in place.

UI UX Pro Max back-navigation, no-result recovery and control-layout guidance informed this batch. Shared dashboard header controls can wrap within the viewport when enlarged text increases the width of student shortcuts. Synthetic browser acceptance covers public link/reload/Back/Forward behaviour and private module search, pagination, preserved links and read-error recovery, including narrow/large-text layouts. No database migration or provider activation is introduced. Hosted publication/acceptance, earlier pending catalogue migrations, replacement lineage/expiry, persistent annotations and provider/device release gates remain outstanding.

## Dashboard query role and retry isolation — 29 October 2026

The shared dashboard query key now includes the active role as well as user, centre and assigned roles. Switching roles clears the previous result and starts a fresh read even when the same account retains both assigned roles. A retained retry callback from an older query scope now returns before changing request generations, so it cannot cancel or replace the current scope's pending read. Existing server-side RLS and query filters remain the authority for access; this change corrects client result lifecycle only.

Regression fixtures cover a role-only switch, immediate result clearing, a stale retry during the replacement read, and a late response from the former role. Hosted migration activation, provider acceptance and physical-device release gates above remain open.

CI initially stopped before browser tests because ubuntu-latest resolved to Ubuntu 26.04, unsupported by pinned Playwright 1.58.2. Pin only browser acceptance to Ubuntu 24.04 so the existing browser version can install and run; package versions and lockfiles are unchanged.

## Learning library access recovery — 29 October 2026

Private access requests now carry a generation guard. Refresh immediately invalidates pending access work and clears the displayed link; module/account/active-role changes and unmount also discard old completions. A late link or error cannot overwrite a newer resource view or a newly requested link. Duplicate access requests are blocked synchronously while one is pending. Existing storage permissions, two-minute expiry and enrolled-resource queries remain authoritative; this client guard does not revoke an already issued signed URL.

Search trims surrounding whitespace, reports matching and total authorised resources, and distinguishes no matches from an empty library. Clear filters restores all resource types and search focus. Resource cards and pagination wrap for narrow screens and enlarged text. Tests cover late success after refresh, late failure after module change and filter recovery. Hosted activation and provider/device acceptance gates remain open.

## Pearson Fine Art and craft catalogue — 29 October 2026

Added the current Pearson BTEC Fine Art Level 4 HNC and Level 5 HND to the shared qualification selection, public awarding-body/subject filters and existing staff course-offer selector. The HND credit display explicitly includes its Level 4 stage. Expandable curriculum separates Pearson modules and assessment units from UniPathway craft-focused teaching themes. The themes receive no separate credit values or invented Pearson unit codes. Practical studio attendance/facilities and the final programme require confirmation; existing approval, admissions, fee and intake checks remain in place. No hosted programmes, enrolments or approval records were created.

Sources checked on 29 October 2026:
- Pearson current qualification page: https://qualifications.pearson.com/en/qualifications/btec-higher-nationals/fine-art-2023.html
- Fine Art specification, Issue 3, August 2026, sections 6.1–6.2: https://qualifications.pearson.com/content/dam/pdf/BTEC-Higher-Nationals/Fine-Art/2023/specification-and-sample-assessments/9781292720579-hn-fineart-spec.pdf
- Linked creative-suite module descriptors, Fine Art section (modules A and B): https://qualifications.pearson.com/content/dam/pdf/BTEC-Higher-Nationals/animation/2023/teaching-and-learning-materials/unit-desc-hn-crea-art-book.pdf

Uses the current Fine Art route rather than the older Art and Design (2017) award. Search includes craft teaching themes and unit/module titles. Regression checks cover body/subject links, qualification identities and cumulative credits, source links and course-specific enquiries, with a browser journey for expanded curriculum in narrow/wide layouts and enlarged dark-mode text.
