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
