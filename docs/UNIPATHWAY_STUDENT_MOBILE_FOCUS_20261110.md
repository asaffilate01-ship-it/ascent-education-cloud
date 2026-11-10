# UniPathway: Student Today & Mobile Safe Area — 10 November 2026

## Scope
Task-led reduction of the student home page and floating tutor on smaller screens. This source-only phase does not change enrolment, recorded attendance, evidence, marks, IQA decisions, welfare case permissions or hosted services.

## Student Today changes
- Keep authenticated enrolment and RLS-scoped Continue Learning and upcoming classes/coursework first.
- Replace three large stacked stat cards with one compact responsive verified learning overview.
- Keep coursework, independently released marks and grade appeals adjacent to the learning overview.
- Preserve wellbeing, anonymous support, all student services and optional STEMCoach access in a clearly labelled lower-priority support section. A collapsed optional-services disclosure must not be confused with approved institutional access.
- Continue to distinguish provisional grades from released scores and an official qualification classification; maintain retry and failure states.

## Mobile tutoring
- Reserve space above the fixed bottom navigation including the device safe area.
- Keep the floating tutor and panel away from the bottom navigation on 360/390 px screens; constrain panel height to dynamic viewport.
- Focus the tutor input when opened and return focus to the launcher after Escape/close.
- Do not expand tutoring access to non-student roles or send private academic evidence by default.

## Acceptance
Source CI exact-head typecheck, lint, unit, database/Edge, build, browser and native checks. Human review of captured 360/390/768/1440 screens and 200% text. Real keyboard/safe-area, assistive technology and production hosted provider setup remain separate acceptance steps.

## Remaining phases
- Full admissions application and verified course offer workflow require separately reviewed backend contracts.
- Fortnightly IQA scheduling and EQA evidence sharing remain inactive pending authenticated centre policy, forward-only SQL, anti-conflict reviewer checks and staging.
- Production publication and Microsoft/payment provider activation cannot be inferred from merging this UI change.
