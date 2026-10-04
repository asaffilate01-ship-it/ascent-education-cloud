# Omniqora Education Intelligence Phase 2

Phase 2 adds a permission-aware knowledge index, graph-edge store, intervention records and Student 360.

The initial Student 360 calculator is deliberately deterministic rather than generative. It converts available event signals into transparent provisional scores and human-review flags. It is not a validated predictive model and must not be presented as one. Later calibrated models can replace it only after benchmark/evaluation and versioning.

## Next event wiring
Emit events server-side from attendance, Teams artifact/attendance ingestion, assignment submission, final assessment, resubmission, lab completion, tuition/STEMCoach progress, residential activity attendance, placement completion and careers/progression actions. Do not trust arbitrary client-generated academic outcomes.

## Knowledge indexing
Only approved/versioned content enters the retrieval index. Student-visible retrieval excludes teacher/marker/IQA material. Teacher/marker/IQA retrieval follows role scope. Graph edges never override underlying RLS/document permissions.

## Intervention workflow
Intelligence may recommend academic support, attendance contact, tutor review, lab support, careers guidance or welfare referral. A named human reviews/assigns/resolves the intervention. No automatic academic penalty, exclusion or misconduct decision.
