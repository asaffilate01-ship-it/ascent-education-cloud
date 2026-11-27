# Formative practice studio — wave 4, 27 November 2026

This wave adds 96 original formative drafts: 48 conceptual questions and 48 deterministic calculation variants. The combined inspected formative library now has 186 distinct question IDs across 16 subject areas. Earlier packs and hosted quiz databases remain separate. All items are marked draft_review_required; no official approval, secure exam material, publication, enrolment, credit or grade is implied.

| Subject | Combined draft questions |
|---|---:|
| School maths | 25 |
| School physics | 25 |
| School chemistry | 9 |
| School biology | 9 |
| School English | 9 |
| School computer science | 9 |
| School commerce | 9 |
| ACCA preparation | 23 |
| Business management | 13 |
| Health and social care | 9 |
| Technology and AI | 9 |
| IELTS and English communication | 9 |
| German | 7 |
| French | 7 |
| Italian | 7 |
| Spanish | 7 |

## Delivered workflows

The existing role-guarded Course Content Hub retains its searchable, paginated library and adds focused 5/10/20-question staff previews, per-question worked feedback, progress, temporary results and missed-question review/retry. Sessions use a fixed bounded selection across topics. A separate local intake accepts structured candidate questions authored by people or external AI tools, checks exactly four choices and one matching answer, field and batch limits, existing subjects and duplicate prompts, and lets staff inspect the candidate explanations. Source labels are self-reported. Neither workflow writes grades, assigns a cohort, creates a published quiz, transmits drafts to an AI provider, or replaces independent academic review. The bundled answer keys must never be used as secure examination material.

The UI follows the existing UniPathway tokens and task-led component system; browser acceptance targets 360, 390, 768 and 1440px and captures practice evidence. Hosted accounts, authorisation, student delivery and publication are separate verification tasks.

## Research and design decisions

Reference review: Moodle question-bank categorisation and preview (https://docs.moodle.org/en/Question_bank); Open edX learning and learner-dashboard microfrontends (https://github.com/openedx/frontend-app-learning and https://github.com/openedx/frontend-app-learner-dashboard); H5P content library (https://github.com/h5p/h5p-php-library); shadcn/ui accessible composition (https://github.com/shadcn-ui/ui). Adopt interaction patterns, not unreviewed code or external branding. No new dependency or third-party question corpus is imported.

Provider-neutral research: OpenAI structured outputs (https://developers.openai.com/api/docs/guides/structured-outputs), Claude structured outputs and tool contracts (https://platform.claude.com/docs/en/build-with-claude/structured-outputs), Gemini schema-constrained outputs (https://ai.google.dev/gemini-api/docs/structured-output), Qwen function calling (https://qwen.readthedocs.io/en/stable/framework/function_call.html), and MCP security practices (https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices). The current local validator is a shared boundary for human and model proposals. It does not verify provider identity or content truth. The OpenAI Evals guide currently documents the scheduled retirement of its legacy Evals platform; use provider-independent test datasets and a maintained evaluation workflow rather than adding a dependency on a retiring API.

## Next approved implementation stages

1. Versioned centre-owned draft storage, exact programme/module/syllabus mapping, rights and reviewer records, safe publication and immutable revisions. Reconcile existing learning tables before creating any new schema.
2. Connect approved AI generation through the existing Omniqora gateway with centre-scoped identity, task-level permissions, server-only credentials, cost/timeout limits and validated outputs. Do not invoke Claude, Gemini, OpenAI or Qwen directly from the browser or imply they are already connected. Provider choice must be evaluated against representative academic tasks and actual consent/retention terms.
3. Define common structured generation and reviewer contracts; deterministic numeric checks, independent answer validation, adversarial/duplicate detection, human subject-specialist sign-off. Evaluate model upgrades on fixed test sets. Never let a model approve a question or determine a formal grade on its own.
4. Allowlisted read-only MCP tools for approved syllabus/material retrieval; verify tenant-specific access on every call, prevent token passthrough and prompt-injected actions, require explicit approval for writes, and audit actions. No unrestricted agent access to databases, credentials or learner documents.
5. Approved learner formative practice, accessible progress, spaced revision and teacher-reviewed recommendations, separating formative attempts from summative exams. Continue mobile/tablet/desktop keyboard, dark-mode and real-device acceptance.

Every proposed question still needs accuracy, current specification, level, accessibility and rights review. The calculation tests check arithmetic and the library tests check identity, format and explanations; neither is a substitute for academic review.
