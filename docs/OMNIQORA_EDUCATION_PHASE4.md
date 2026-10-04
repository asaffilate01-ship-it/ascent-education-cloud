# Omniqora Education Phase 4

Adds School/Department/Institution 360, criterion-level course intelligence and the first permission-aware knowledge-indexing boundary.

## Course 360
The criterion intelligence model is designed to surface repeated weak criteria, resubmissions, IQA flags and AI/human disagreement. These are quality signals, not automatic lecturer/student performance judgements.

## Organisation 360
Roll-up levels: course/cohort -> department -> school -> institution. Intended outputs include learner volume, active courses, attendance, engagement, completion, high-attention workload, assessment-quality signals and capacity/intervention needs.

## RAG indexing boundary
Only approved knowledge-document records with controlled source references are eligible. Every future chunk/vector must preserve tenant, source, course/module, visibility and version metadata. Retrieval must filter permissions before content is returned. Teacher/marker/IQA packs cannot leak into student retrieval.

This function intentionally does not invent a vector database or remote Omniqora endpoint. Once the central Omniqora AI gateway is accessible, it can consume this controlled batch contract.
