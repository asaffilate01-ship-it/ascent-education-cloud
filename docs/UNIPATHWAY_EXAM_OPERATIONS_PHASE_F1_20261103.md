# UniPathway Phase F1 — internal examination operations (3 November 2026)

## Scope and current release state
This phase adds a role-specific internal examination planning module:
- **Exams Officer** `/exams/session-plans`: centre calendar → internal room-capacity and planned-candidate counts → proposed invigilator count → four separate process-review attestations → draft/submitted revision.
- **Centre Director** `/director/exam-plans`: read the same centre's projected internal plan and independently approve an exact, still-current submitted revision. The submitting officer must be a different database user.
- **Both roles**: explicit centre and selected-role verification, read-only no-PII RPC projection, no cross-centre query, empty/error states, stable identity-switch remounts, and source-projected validation.
- Full desktop and native navigation routes, unit and synthetic PGlite DB acceptance.

**Important**: This is **internal preparation**, not examination registration, confirmed candidate eligibility, immigration/admission approval, allocated individual seats, actual invigilator certification, board accreditation, malpractice adjudication, examination grade, or official certificate. Checkboxes attest staff reviewed a **procedure**, never the identity of each student.

## Default-off activation boundaries
- Browser: `VITE_UNIPATHWAY_EXAM_OPERATIONS_ENABLED=true` enables reads only after verified backend activation.
- Browser: `VITE_UNIPATHWAY_EXAM_OPERATIONS_WRITES_ENABLED=true` exposes drafting and submission buttons; only when read flag is also enabled.
- Browser: `VITE_UNIPATHWAY_EXAM_OPERATIONS_APPROVALS_ENABLED=true` exposes Centre Director's separate internal approval button; requires both browser flags above.
- Backend: private `unipathway_examops.activation_gate.reads_enabled` and `writes_enabled` are **both FALSE** at creation. Browser variables are never authoritative.
- SQL is a **forward patch** at `scripts/activation/unipathway-exam-operations-forward.sql`, not an implicitly executed migration. Do not modify the historical Supabase migration ledger.
- The only public API surface is three `SECURITY INVOKER` wrappers. Their private `SECURITY DEFINER` implementations check live `auth.uid()`, matching `profiles.tenant_id`, matching current centre-specific `user_roles` membership, active tenant status and independent backend gates.
- The exam tables are in a private, non-Data-API schema with RLS enabled and no authenticated/anonymous table grants. Field-level read projection omits subject identities, candidate records, full seating lists, reviewer IDs, document references and incidents.
- Write receipts are idempotent by actor/centre/event/request ID + payload, not by a guess about network success; stale revisions and conflicting request replay reject. Centre Director approval checks complete processes, resubmission version, independent reviewer and unchanged calendar snapshot.

## Required activation acceptance (currently NOT satisfied by source CI)
1. Positively identify the **real UniPathway Supabase project**, verify current migration receipts, backup/restore availability and deployment owners. A connected account previously exposed **DISHBEE only**: **never run this patch there**.
2. Review the exact `academic_events`, `tenants`, `profiles`, `user_roles` schema, existing triggers, role revocations, Postgres privileges, default grants, API exposed schemas, and row-level security. Assess whether `unipathway_examops` is excluded from Data API exposure.
3. Apply the forward patch to a **fresh or verified two-centre UniPathway staging** project only. Backend gates stay OFF until negative JWT, PostgREST, RPC, direct private schema, user revocation, centre suspension and role cross-over tests pass.
4. Run `node scripts/test-unipathway-exam-operations-db.mjs` locally (synthetic PGlite) and production CI. Then with actual staff JWTs test candidate limits, invalid calendar sessions, no-venue events, idempotent retry, stale revision, edited calendar, same-user reviewer separation, and two-centre data minimisation.
5. Obtain centre policy approval for room-capacity sources, actual invigilator requirements, standard operating procedure version, access log retention and source-to-session matching. Consider two-person approval of higher-stakes sessions.
6. Activate reads first, verify projected fields and pagination, then writes and approvals in separate reviewed changes. Never import real candidate names or document images into the planning table.
7. Verify with actual browser sessions, mobile role switching and cancellation. Revoke or pause backend gates immediately if access is inconsistent.

## Next phases still unbuilt / unactivated
- Real candidate exam entries: consent, awarding-body eligibility and official booking confirmation, not merely internal headcounts.
- Secure personalised seating assignments, accessible accommodations, verified invigilator appointment and identity protocols.
- Exam attendance, incidents, invigilator signature, appeal audit, regulated board result ingestion and certificate provenance.
- Separate appointment/EQA scopes and credential verification, and overall UniPathway staged rollout of Teams, labs, wellbeing, staff access and content-rights systems.
