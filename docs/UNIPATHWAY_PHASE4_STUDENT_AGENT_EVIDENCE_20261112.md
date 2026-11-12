# UniPathway Phase 4 — traceable, read-only AI/MCP study evidence (12 November 2026)

## Purpose
Enable a future student-only, source-grounded tutor or MCP v2 adapter to distinguish **verified tool metadata** from model text. This is not a new LLM, a deployed MCP server or a licence to automate academic decisions.

## Source changes
- Keep the existing `unipathway-student-read-tools` Edge endpoint disabled by default (`UNIPATHWAY_STUDENT_READ_TOOLS_ENABLED`), with per-request Supabase JWT authentication, verified profile centre, active student role, active enrolment, caller-scoped RLS and per-IP rate limits.
- Validate every successful tool response against one of three exact output schemas: programme identity / catalogue status; published coursework deadlines; published material metadata. Bound to 50 records, ban unexpected fields/nested objects, enforce unique opaque record IDs, require complete fields and valid dates. Fail closed on a malformed or oversized result rather than emitting `complete:true` for partial data.
- Add an explicit `sourceRefs` array containing table + record ID for each returned item, a timestamp and `trust:untrusted-record-metadata`. These references are **internal row identifiers**, not signed file URLs, official qualifications, citations to publisher material or verification of the content of an LLM answer.
- Keep all three tools strictly read-only; no supplied centre/user IDs, arbitrary SQL, grades, student personal data, profile medical information, KYC, payments, storage paths or model-provided tool arguments are accepted.

## Security model and future MCP adapter
Official MCP TypeScript SDK v2 implements the 2026-07-28 protocol: https://ts.sdk.modelcontextprotocol.io/v2/ . A future private server should use the v2 `@modelcontextprotocol/server` package, typed empty-object tool inputs, a verified Auth/JWT context **per invocation**, explicit tenant/record policies, tool allowlists, cost and output bounds, and testable consent/approval gates. Avoid relying on text instructions for authorisation. Never put a service-role key into a browser or give an AI agent broad SQL or write permissions.

Threat cases covered by the new unit suite: unsanctioned fields (grades, student IDs, signed URLs, private paths), duplicate/fake IDs, oversized and incomplete result batches, invalid timestamps, malformed nested data and prompt-injection-looking titles (kept marked as **untrusted data**, never promoted to instructions). The OWASP LLM Top 10 guidance covers prompt injection, disclosure, excessive agency, output misuse, misinformation and resource consumption: https://genai.owasp.org/llm-top-10/ .

## Evaluation and UX follow-up
- Add synthetic hallucination/faithfulness and PII-leak tests with Promptfoo or equivalent before connecting this evidence format to Omniqora or another approved model. A model must quote the verified source version, abstain if missing, and defer high-stakes grading or eligibility to a human. Revalidate every clicked item through protected routes.
- Continue real 360/390/768/1440px mobile/desktop, keyboard, 200%-text, safe-area and slow-network acceptance of the **student-side study focus**, separately from the tool protocol.
- Check awarding-body approval, content rights and uploaded document provenance before an LLM can retrieve licensed course files; this phase contains **no document content**.

## Release boundaries
This PR modifies only source code and fixture tests. Do not deploy Edge changes or enable the flag against a live institution until staged centre-A/centre-B Auth + RLS + private Storage acceptance, rate-load checks, data protection review, audit policy and rollback are independently approved. Human assessor and IQA decisions remain mandatory. No Lovable agent credits, paid model calls or hosted database writes are performed in this phase.
