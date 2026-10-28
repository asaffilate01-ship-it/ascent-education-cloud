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
