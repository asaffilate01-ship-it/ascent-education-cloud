# UniPathway assessment review — browser viewport recovery (12 November 2026)

## Trigger and evidence
Post-merge main CI at commit `197052d`, Actions run `43247493072`, failed only the Chromium lecturer assessment-review journey. The Playwright test correctly asserts that the full review dialog stays inside 360, 390, 768 and 1440px viewports at normal and 200%-sized root text. Unit, DB, Edge, lint, type and build gates passed. The failing assertion was **review dialog outside viewport**, not an academic marking or database result.

## Fix
- Keep the lecturer's Radix review dialog centred, but give it explicit `width:calc(100vw - 32px)` and `max-height:calc(100dvh - 32px)`. This avoids reliance on nested Tailwind arbitrary `calc()/min()` expression parsing at the narrow/high-text boundary.
- Scroll within the dialog using `overflow-y-auto`, `overflow-x-hidden` and `overscroll-contain`; keep criterion details, uncertainty/retry state, exact assessment references and save buttons untouched.
- Keep the close button's 44px target and existing keyboard-focus restoration.
- Improve failing browser diagnostics with actual viewport bounds, computed width/max-height/scroll style and overflowing element descriptions, without weakening the pass condition.
- Add unit coverage for the explicit viewport sizing, scroll container and preserved reviewed save action.

## Required acceptance
Exact PR-head `typecheck`, `lint`, `unit-tests`, `database-tests`, `edge-tests`, `build`, and 360/390/768/1440px + 200%-text browser acceptance. Also pass Android/iOS CI and design quality. Production source tests do not substitute for physical TalkBack/VoiceOver or a signed-in lecturer acceptance.

No production database changes, provider keys, grade/IQA logic changes, Lovable-agent credits or live publication.
