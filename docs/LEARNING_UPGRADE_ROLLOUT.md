# Learning upgrade rollout

## Implemented in this change

- Qualification stages: Level 3, university foundation year, Level 4, Level 5 foundation degree versus diploma, Level 6 and postgraduate Level 7. Existing catalogue filters now include shareable qualification level. Guidance does not create unverified intakes or progression guarantees.
- Quiz server authority: authenticated start/resume, immutable question snapshots, saved answers, server deadlines, server marks, idempotent submission and maximum attempt enforcement. Keys live in a private schema. Results honour the frozen visibility setting. Staff access is limited by existing module allocation rules.
- AI assessment regression checks: exact quotations, controlled criterion identity, complete coverage and numeric mark bounds. Legacy assessment reports cannot persist model-assigned final grades or misconduct claims. These are deterministic validation tests, not evidence of live model accuracy.
- Axe + Playwright qualification accessibility checks at mobile and desktop widths are in production CI.
- Promptfoo adapter and six synthetic study-assistant regression scenarios under `evals/`. Live execution needs an authenticated staging learner and connected Omniqora endpoint. The adapter uses the existing role/quota boundary and fails visibly when unavailable.

## Rollout and acceptance

1. Run unit, database, fresh-schema, type, lint, build and browser CI.
2. Apply `20261030205928_reliable_quiz_sessions.sql` transactionally, then publish the client. Old clients cannot write scores after migration; refresh open quiz pages. Do not roll back to client-authored grading.
3. Deploy the changed assessment functions and their shared validators using the existing Lovable/Supabase release workflow. Provider availability remains independent of code deployment.
4. For Promptfoo, set `UNIPATHWAY_EVAL_URL` to the staging `/functions/v1/ai-study-assistant` endpoint and `UNIPATHWAY_EVAL_USER_TOKEN` to a short-lived staging learner access token in the process environment. Run `promptfoo eval -c evals/promptfooconfig.json --no-cache` in the approved evaluator environment. Do not use real learner work or commit tokens. Review full answers; passing keyword assertions is necessary but insufficient for release.
5. A teacher should perform a real allocated-course quiz and a human-reviewed assessment before course activation. Synthetic database tests do not prove hosted provider acceptance.

## Remaining integrations from the repository audit

These remain implementation work, not active features or installed integrations.

| Integration | Intended work | Required acceptance |
| --- | --- | --- |
| Docling + pgvector | Versioned ingestion of approved specifications and scoped semantic retrieval | Source/page provenance, tenant/course isolation, withdrawal and re-index tests |
| ts-fsrs | Private revision cards and due-review scheduling | Per-learner history, timezone handling, accessibility and recovery |
| Storybook / design guidance | Shared component states and consistent dashboard interactions | Real empty, loading, error and permission states; keyboard review |
| Langfuse | Redacted AI latency/cost/quality tracing | Approved destination, no raw student work by default, retention policy |
| Narrow UniPathway MCP | Authenticated course, source and learning-progress tools | Per-tool access checks, no generic SQL, audit trail, confirmation for writes |
| Curriculum / diagnostic / tutor / question agents | Reuse Omniqora and controlled curriculum, reviewed question publication | Evaluation corpus, grounded citations, human review and budgets |
| LangGraph.js | Durable coordination in Omniqora where multi-step work warrants it | Retry/idempotency tests, cancellation, bounded tool permissions |
| H5P/Lumi | Isolated interactive activity pilot | Content licensing/GPL distribution review, sandboxing and result validation |
| OR-Tools | Constraint-based timetable suggestions | Conflict checks, teacher review and existing Teams workflow integration |
| LiveKit | Optional language-practice rooms | Separate deployment, explicit microphone controls, moderation and access rules |

Keep STEMCoach as a separate entitled integration and Teams as the primary live-class platform. Do not advertise foundation degree, foundation year or postgraduate enrolment until the actual provider, authorisation and intake are confirmed.

Sources: [UK qualification levels](https://www.gov.uk/what-different-qualification-levels-mean/list-of-qualification-levels), [Playwright accessibility](https://playwright.dev/docs/accessibility-testing), [Promptfoo custom provider](https://www.promptfoo.dev/docs/providers/custom-api/).
