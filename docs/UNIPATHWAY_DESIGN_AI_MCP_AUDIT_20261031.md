# UniPathway next-phase quality, design and AI/MCP review — 31 October 2026

## Scope and evidence

Source: `asaffilate01-ship-it/ascent-education-cloud` default branch and current portal code, `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, current Vite/React 18/Tailwind 3/shadcn/Radix stack and existing CI. External open-source discovery compared targeted maintained repository candidates and catalogues. **This was not an exhaustive line-by-line audit of thousands of repositories**; popularity alone does not establish maintenance quality, suitability, security or licence compatibility.

Release boundary: changes in this pull request are **source and CI only**. No Lovable agent messages/credits, new provider keys, paid model calls, installations, hosted database writes or live publication were undertaken.

## Confirmed defects addressed

| Existing behaviour | Why it matters | This batch |
| --- | --- | --- |
| `/ai-recommendations` used general `ProtectedRoute` | Any signed-in role could open a page that queried institution-level records | Restrict route to `Director` role guard and active role/centre check before client queries |
| Legacy submission `grade` treated missing/undefined as 0; grade cut-offs labelled students 'at-risk', 'merit', 'distinction' and 'university ready' | Unreleased or partial marks cannot establish qualification results, risk or admission eligibility | Remove this inferential scoring and any university qualification claims; present centre-scoped operational record counts only |
| 'Generate AI Insights' sent `prompt` to `ai-study-assistant`, whose validated request contract requires `question` | Button was not a working institutional analysis flow; failed requests gave a misleading success-style toast | Remove unsupported provider action; offer truthful, local de-identified review brief and human-owned source links |
| Empty or failed institutional queries risked being shown as good performance | Data absence is not healthy learning | Explicit loading, failure/retry, no-evidence and verified states; never show partial figures |
| Study tutor rendered for any authenticated user | Partner/staff roles could open and retain a student-facing session | Active assigned student role only, reset on role switch, server-side `user_roles` check before model/quota calls |
| Tutor's small targets and unqualified welcome copy | Poor touch accessibility and potential confusion about official results | 44px controls, labelled log/dialog, reduced-motion entry and advice/privacy boundaries |
| Service directory required exact word order in substring search | Roles with many tools struggled to find paths | Local word-based matching, '/' keyboard focus and responsive task-led directory |

The original backend for the tutor uses `OMNIQORA_TUTOR_URL` and a quota function; this PR does **not** activate Omniqora or certify that the endpoint is currently connected. The backend role check must be deployed and tested with authorised accounts before claiming hosted protection. Other independently reviewed academic and marking workflows are unaffected.

## Design direction (Taste Skill + Impeccable + Awesome DESIGN.md)

- **Taste Skill** (MIT): follow its *app screen*, not generic landing-page, guidance. Make tasks/evidence the visual anchor, not ornamental hero statistics; keep Sora, Manrope and UniPathway semantic tokens.
- **Impeccable** (Apache-2.0): apply critique > audit > harden > polish to loading/empty/error/denied views, focus order and tap size. Its detector is *advisory* until any false positives against institutional tokens are reviewed. A version-pinned optional source scan can be performed on a checkout, but this batch did not install its binary.
- **Awesome DESIGN.md** (MIT): improve UniPathway's own `DESIGN.md` rather than copy another product's palette, typography or trademarked component styling.
- This batch improves `RoleWorkspace` and leadership operations insights. Marketing heroes, images, SEO and employer-consent review are out of scope to avoid overlap with other PRs.

## Prioritised maintained GitHub shortlist

| Candidate | Verified source | Potential UniPathway impact | Decision |
| --- | --- | --- | --- |
| Taste Skill | https://github.com/Leonxlnx/taste-skill | Screen hierarchy and app-screen design review | Guidance applied; no installer |
| Impeccable | https://github.com/pbakaus/impeccable | Accessible forms, error handling, responsive QA, design critique | Guidance applied; future opt-in scan |
| Awesome DESIGN.md | https://github.com/VoltAgent/awesome-design-md | Reproducible design tokens and typography direction | Own design authority updated |
| UI UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | Large searchable UX heuristics, palettes, interaction patterns | Existing documented reference; do not copy components blindly |
| React Spectrum / React Aria | https://github.com/adobe/react-spectrum | Advanced accessible controls and keyboard navigation | Evaluate targeted gaps; existing Radix primitives retained |
| TanStack Query | https://github.com/TanStack/query | Cancelled/scope-keyed queries and cache invalidation | Already installed; use to improve future role-scoped read paths |
| Playwright MCP | https://github.com/microsoft/playwright-mcp | Repeatable browser inspection for desktop/mobile and accessibility | High priority when protected staging identities work; no production credentials |
| Promptfoo | https://github.com/promptfoo/promptfoo | Synthetic red-team/evaluation gates for tutoring, academic uncertainty, prompt injection | Existing `evals/` infrastructure; review fixture-only expansion; avoid paid provider calls |
| OpenAI Agents JS | https://github.com/openai/openai-agents-js | Human-approved tool-handoff/agent execution on TypeScript services | Candidate for a **separate** authenticated backend pilot, not the browser |
| LangGraph | https://github.com/langchain-ai/langgraph | Durable staged agent workflows with explicit approval gates | Alternative, not an additional mandatory dependency |
| Official MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | Strict allowlisted centre tools, typed inputs and outputs | Proof-of-concept only after threat model and tenant binding |
| MCP Inspector | https://github.com/modelcontextprotocol/inspector | Tool contract and negative-authorisation testing | Useful for future private MCP server test environment |
| Model Context Protocol reference servers | https://github.com/modelcontextprotocol/servers | Tool and resource protocol examples | **Reference only, not production-ready** without security review |
| Microsoft MarkItDown | https://github.com/microsoft/markitdown | Server-side document extraction for uploaded academic resources | Evaluate sandboxing, licensing, retention; don't replace validated DOCX/PDF paths yet |
| Haystack | https://github.com/deepset-ai/haystack | Source-grounded knowledge retrieval/evaluation | Later controlled academic knowledge agent, human-approved sources only |
| Guardrails AI | https://github.com/guardrails-ai/guardrails | Input/output validation for model-assisted drafts | Compare with existing project-specific assessment validators before installing |
| Langfuse | https://github.com/langfuse/langfuse | Agent tracing and evaluation | Defer: verify data locality, privacy, deployment/hosting costs and licensing first |

Licence metadata was checked against the GitHub repository API; where a repository reports `NOASSERTION`, individual package licences require fresh inspection before incorporation. No external source was copied into the application and no new packages were installed.

## Phase sequence after this pull request

1. **Now:** role-gated operational intelligence, local evidence aggregation, learner-only study tutor, task-led workspace search, verified failure states and unit coverage. Maintain existing official grades, attendance corrections and human decisions.
2. **Next:** isolated, operational UniPathway staging with two tenants, role fixtures and signed-in end-to-end tests; prove that assigned and revoked permissions, cached results, provider errors and course/private file access behave correctly.
3. **Learning retrieval agent:** use approved, versioned course materials only; show exact course/module citations, source date, unsupported-answer fallback, student-side no-copying guidance, and staff correction workflow. Do not expose other learners' work.
4. **Assessment support agents:** controlled rubric/evidence retrieval, missing-evidence flags, independent assessor/IQA human signoff and adversarial evaluations; never issue marks, misconduct labels or plagiarism percentages as final decisions.
5. **Admissions and career agents:** draft checklist reminders, eligibility *review* and verified employer opportunities; do not independently approve employers, promise funding/visa success or allocate unsupervised internships.
6. **Provider MCP pilot:** server-side read-only tools (e.g. `search_my_published_modules`, `list_own_deadlines`, `list_authorised_course_sources`), per-request auth/tenant/role scope, explicit allowlist, auditing, rate limits, prompt injection tests and human approval for writes. Never connect an MCP server directly to a service-role key in the browser.
7. **Wider design:** enrolment and tuition journeys, mobile classroom join/recordings, lecturer grading queue, parent-shared progress, employer onboarding, finance and documents; audit each with real 360/390/768/1440 px captures and screen-reader/keyboard checks.

## Acceptance and remaining blockers

- Source CI: TypeScript, lint, units, database tests, build, edge and synthetic browser checks on the **exact PR head**.
- Manual: sign in as student, employer, lecturer, centre director and superadmin across two independent centres. Confirm student-only tutor, staff-only academic insights and negative RLS cases directly via API, not merely hidden UI.
- Tutor Edge Function deployment and role verification is an **independent change**. Never assume source merge deployed a provider function.
- The previously created employer-consent PR #149 must remain independently reviewable until its privacy rollout gate. This PR does not replay employer migrations, create fictitious partnerships or publish any vacancies.
- Hosted knowledge agents require source licensing, explicit content-owner approval, consent, retention limits, provider cost guardrails, and evaluation traces **before activation**.
- No paid Lovable/AWS/Teams/model infrastructure is provisioned or contacted by this work.
