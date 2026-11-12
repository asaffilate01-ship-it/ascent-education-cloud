# UniPathway Phase 3 — task-led workspaces and evidence-backed study guidance (12 November 2026)

## Source build delivered
- **Student and lecturer navigation:** preserve every route from `NAV_CONFIG` and every role-specific search result, but group specialist destinations by the work they support (learning, assessment, progress, support; teaching, feedback, students). The Everyday section is unchanged. Unclassified new links fall back to **Other services**, never disappear.
- **Next learning focus:** a deterministic, student-only read model chooses an immediate class-access check when appropriate or a current published coursework action, then falls back to pending human review or independently released feedback. It never issues a mark, decides enrolment, creates Teams invitations, launches tools or automatically sends messages.
- **Integrity:** only emit a suggestion after *both* learner-owned coursework and enrolled-module class reads complete without error. Hide rather than fabricate a recommendation on stale, denied or partial data. Every action links back to a protected page that checks role, centre, enrolment, revision, submission windows and class invitation.
- **Mobile/desktop:** keep 44px interaction targets, short cards, responsive wrapping, light/dark semantic tokens, accessible text, explicit record provenance and Pakistan-local date labels. Keep existing 5-tab mobile bottom navigation and keyboard-operable search.

## Targeted open-source / MCP review
On 12 November 2026 a broad metadata sweep queried 646 GitHub repository results across LMS, offline learning, student information systems, rubrics, accessible React components, education MCP, grounded AI tutoring and adversarial evaluation. This is **search-and-shortlist**, not a source audit of every repository or adoption of their libraries. The preceding 9 November survey examined another 2,400 search results; duplication or completeness across those searches is not asserted.

| Repository | Practical lesson | Decision |
|---|---|---|
| [Frappe LMS](https://github.com/frappe/lms) (AGPL) | Clear courses, chapters, progress | UX reference only; no code copied |
| [Kolibri](https://github.com/learningequality/kolibri) (MIT) | Low-bandwidth/offline study | Reference for future offline/Android acceptance |
| [PrairieLearn](https://github.com/PrairieLearn/PrairieLearn) (licence verification needed) | Evidence-led assessments | Review concepts only; human assessor and IQA remain authorities |
| [React Spectrum](https://github.com/adobe/react-spectrum) (Apache-2.0) | Accessible navigation and disclosure | Patterns only; retain existing Radix/shadcn stack |
| [TanStack Query](https://github.com/TanStack/query) (MIT) | Correct client cache scope and retry | Already present; use selectively |
| [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) (Apache-2.0) | Real screen and keyboard inspection | Retain existing Playwright CI; staged authenticated review later |
| [Promptfoo](https://github.com/promptfoo/promptfoo) (MIT) | Prompt-injection, misinformation and evaluation tests | Fixture-only audit first; no paid provider calls |
| [Official MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/) | 2026-07-28 protocol typed tools and authorization | Future separate private read-only adapter only; no SDK dependency installed |
| [OpenAI Agents JS](https://github.com/openai/openai-agents-js) (MIT) | Agent orchestration with approval gates | Research candidate, not installed |
| [LangGraphJS](https://github.com/langchain-ai/langgraphjs) (MIT) | Durable multi-step workflows | Alternative to Agents JS, avoid duplicate frameworks |

Only GitHub, Supabase and Lovable connectors are relevant to this source build; other connected MCP capabilities (media, Stripe, scheduling, etc.) are not authorised shortcuts to learner records or an excuse to introduce more services. Tools from external MCP servers must not be accepted without operator-approved trust, provenance, secret boundaries and licence reviews.

## AI, GenAI, and agent safety: actual status versus next rollout
This source phase **does not deploy an autonomous agent or claim an AI model verified these suggestions**. The existing Omniqora tutor and disabled-by-default `unipathway-student-read-tools` Edge adapter are separate systems. The next safe agent implementation should use official MCP v2 server packages only after review, re-authenticate the student's JWT for every call, derive centre from the verified profile, check active role and enrolment under RLS, apply exact allowlists and bounded results, and emit versioned source references only. It must not expose unapproved materials, grades, KYC, medical records, arbitrary SQL or signed storage URLs.

Risk controls follow the [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/): guard against prompt injection, sensitive-information disclosure, excessive agency, output misuse, misinformation and unbounded model usage. An LLM answer cannot publish assessments, mark work, approve IQA samples, issue offers, confirm payments or certify awards. Human reviewers own each of those decisions. Provider answers must show when evidence is missing.

## Verification and release boundary
- Required: exact PR-head TypeScript, lint, unit, staged/synthetic database and Edge security, browser layout and navigation, Android/iOS build and design checks.
- Required after source merge: independent authenticated test centre A/B acceptance; real iOS/Android low-speed/offline, 360/390/768/1440px, 200% zoom, keyboard/screen-reader testing; RLS/Storage and teacher/student invitation checks.
- No live Supabase migration, provider key, paid model call, Lovable credit usage, production database mutation or deployment approval is part of this PR.
