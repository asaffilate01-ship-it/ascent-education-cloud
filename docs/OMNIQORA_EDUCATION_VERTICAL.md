# Omniqora Education Vertical

UniPathway remains the education-domain application. Omniqora is the reusable SaaS control/intelligence layer.

## Factory hierarchy
Omniqora product: UniPathway -> landlord -> tenant/institution -> centre/campus -> school -> department -> programme/course -> cohort -> learner.

## Shared control-plane candidates
Tenant launch/provisioning, identity, subscription/billing, communications, AI provider gateway, audit/observability, analytics/event contracts and reusable white-label configuration should progressively move to shared Omniqora services. Education-specific admissions, qualification rules, teaching, assessment/IQA, residential weeks, vocational evidence and progression remain in UniPathway.

## Education Intelligence event contract
Events include attendance, live-class engagement, assignment submission, assessment/resubmission, lab completion, tuition/STEMCoach progress, placement, careers and residential participation. Events are tenant-scoped and should contain the minimum necessary data.

## Student 360
Signals: attendance, LMS/class engagement, assessment trajectory, resubmissions, lab/practical progress, tuition/STEMCoach learning, residential attendance and careers activity. Outputs: risk/engagement/readiness scores, transparent factors and recommended interventions. High-impact actions require human review; intelligence must not autonomously penalise or exclude learners.

## Course/Cohort 360
Completion, attendance, resubmission, weak assessment criteria, engagement, lab outcomes, assessor/IQA patterns and recommended curriculum/teaching interventions.

## RAG / GraphRAG target
RAG sources: approved course specifications, policies, student-facing learning content, teacher packs, assessment rules and controlled institutional documents.
Graph relationships: awarding route -> qualification -> level -> course -> module -> learning outcome -> assessment criterion -> material -> assignment -> cohort -> learner evidence -> assessor/IQA decision.
Never allow retrieval to bypass document/tenant/role permissions.

## Current integration state
This repository now contains the local registration/event/intelligence contract. A live central Omniqora Factory connector cannot be completed until the central Omniqora repository/API/credentials are available to this GitHub connection. Do not invent the remote API.
