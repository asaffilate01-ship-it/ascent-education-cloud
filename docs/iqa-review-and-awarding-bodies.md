# IQA review and additional awarding-body guidance — 26 October 2026

## Review workflow

The assigned IQA now sees the published outcome, criterion description, scoring guidance and maximum alongside each marker decision. Original submitted text uses the same numbered view as marking. A local checklist gates approval; a reasoned return remains available without asserting that all criteria passed. The checklist is a UI aid, not proof of human review or a new server-side assessment policy.

The queue separates work awaiting review and awaiting release, supports search, retains the selected attempt in the URL and warns before discarding rationale when changing attempts or refreshing. Account changes clear private review state. Rationale is not autosaved. The existing 300-allocation limit remains.

`review_uni_mark_revision` serialises on the attempt, checks the currently allocated IQA and exact expected mark revision, then delegates to the established decision/release functions. A stale review cannot approve or release a newer mark through this endpoint. Existing legacy RPCs remain for compatibility and do not gain an expected-revision parameter in this phase. Approval and release remain separate audited actions. Student released-result cards now link directly back to lessons and coursework in the same module; private or provisional scores are not exposed.

Validation: eight IQA UI tests and five existing assessment-history tests, with module links checked; 12 added real PostgreSQL workflow checks inside the coursework fixture (33 total coursework checks), exercising return/re-mark/stale approval/separate release; existing guardian/resource checks; 198-migration rehearsal; TypeScript/build; browser 390px/1440px review-to-release using a synthetic backend. The exact migration passed live rollback preflight before transactional deployment. No real grades were approved or released.

## Public qualification guidance

Added ATHE, Pearson BTEC in Pakistan and VTCT Skills information to `/qualifications`; added VTCT Skills to `/beauty-aesthetics` and updated navigation descriptions. These are pathway-information cards with official sources and admissions links, not unverified course offers, invented fees/intakes, centre-approval badges or guaranteed equivalence. Existing OTHM/Qualifi catalogue filters continue to filter those catalogued qualification titles.

Sources reviewed:
- https://athe.co.uk/qualifications/ and https://athe.co.uk/who-we-are/
- https://www.pearson.com/higher-education/campaigns/btec-students-pakistan.html
- https://www.pearson.com/higher-education/btec-international/educators-pakistan.html
- https://www.vtctskills.org.uk/learners/

## Omniqora assessment connection audit

UniPathway's `omniqora-assessment-advisory` is implemented as an allocated-assessor-only advisory call. It sends the approved brief, frozen rubric and up to 30,000 characters of written evidence through `_shared/omniqora.ts`, validates criterion maxima and exact evidence quotes, and saves a private AI draft. The human assessor must verify it; separate IQA approval and release remain mandatory. This is not full PDF/DOCX/OCR marking, autonomous grading or an integrity verdict.

Source also contains `academic-integrity-agent` for advisory integrity signals and `ai-study-assistant` for learning support. These are separate purposes, not evidence that an autonomous multi-agent marking pipeline is running. Omniqora owns provider/model routing; UniPathway records the current generic `omniqora-managed` label and does not hard-code a selected provider/model for this advisory call.

Inspected Omniqora repository `asaffilate01-ship-it/seamless-comms-suite`, commit `4b01c464ceed5d9e347ef8cccea7fcef1b7dcd19`. `services/transformation/transformation/ai_providers.py` implements adapters for OpenAI, Azure OpenAI, Anthropic, Gemini, Bedrock and Ollama. This confirms provider-adapter source, not active credentials, service hosting, a UniPathway-compatible endpoint, model approval or a successful production call. No Omniqora source was modified in this phase.

Activation still needs: deployed compatible gateway returning `{reply}`, centre-bound `OMNIQORA_AI_URL`, `OMNIQORA_AI_TOKEN` and `OMNIQORA_AI_TENANT_ID`, `UNIPATHWAY_OMNIQORA_ASSESSMENT_ENABLED=true`, relevant edge deployment, configured/approved Omniqora provider and model, institutional data/consent configuration, budget controls and an end-to-end assessment test. No secret values were read or printed. The exact provider/model for UniPathway remains unverified.
