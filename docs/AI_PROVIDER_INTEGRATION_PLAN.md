# AI Provider Integration Plan

UniPathway agents are provider-neutral. Provider/model IDs live in configuration so models can be benchmarked and replaced without rewriting academic workflows.

## Recommended production stack
1. Primary reasoning/assessment provider: OpenAI API. Use for criterion mapping, assessment draft, second-read reasoning, course QA and complex consistency analysis. Keep human marker authority.
2. High-volume/low-cost secondary provider: Google Gemini API. Use for document/video summarisation, teaching-video transcription/analysis assistance, scheduling and lower-risk extraction/classification. It also provides a useful independent second-model comparison for evaluation.
3. Academic integrity: Turnitin Similarity / Turnitin Core API. Treat similarity as evidence for human review, never an automatic misconduct verdict.
4. Document extraction: Azure Document Intelligence or equivalent OCR/document extraction provider for CNIC/certificates/transcripts, with NADRA/board/university/human verification remaining authoritative.
5. NADRA Nishan/Verisys: identity verification when UniPathway receives institutional approval and production credentials. This is an authoritative connector, not a generative AI agent.

## Do not buy a separate AI SaaS for every agent
Submission Intake, Resubmission, Release Gate, Audit, timetable constraints and permission checks should primarily be deterministic application services. LLMs are used only where semantic judgement/extraction adds value.

## Model governance
Store provider, model, prompt version, specification version and rubric version with every AI assessment. Run a benchmark set before changing models. Never silently switch the marking model in the middle of a cohort without versioning/evaluation.
