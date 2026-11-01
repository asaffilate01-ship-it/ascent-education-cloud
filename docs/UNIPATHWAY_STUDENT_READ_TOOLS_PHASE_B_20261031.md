# UniPathway — read-only student agent tools, phase B (source-only)

## What this implementation is

A **disabled-by-default authenticated HTTPS tool executor**, deliberately SDK-neutral and ready to be adapted to the official MCP TypeScript SDK v2 once an approved separate backend/service deployment is available. It is **not yet** a hosted MCP server, LLM integration or agent capable of making decisions.

The official MCP SDK v2 is maintained at https://github.com/modelcontextprotocol/typescript-sdk and documents tools, Streamable HTTP, OAuth and role-aware deployments. No MCP SDK package or third-party model code has been installed in the UniPathway browser.

## Exact tools — no arbitrary parameters

| Tool | Source | Returned |
| --- | --- | --- |
| `list_my_programmes` | active `student_enrolments` and authorised `programmes` | permitted title, level, status, awarding-body catalogue label, record reference |
| `list_my_coursework_deadlines` | published `unipathway_assessment_briefs` for modules in active enrolled programmes | title, module reference, due date and cutoff |
| `list_my_published_materials` | published, currently available `unipathway_module_materials` for enrolled modules | title, kind, module and record reference, **not** the storage path |

All tool names are exact allowlisted strings; request JSON must have exactly one `tool` property. The endpoint accepts no user IDs, tenant IDs, arbitrary SQL, prompts, module overrides, service role secrets, write actions, chat messages or model-supplied filters.

## Security contract

1. `supabase/functions/unipathway-student-read-tools/index.ts` returns 503 unless `UNIPATHWAY_STUDENT_READ_TOOLS_ENABLED=true` is deliberately set as a **server-only** environment variable.
2. The requester must have a valid verified JWT. The centre is read from their own authenticated profile.
3. A centre-matching assigned `student` membership is looked up under the same JWT; errors and ambiguous memberships deny access.
4. The server reads only **the caller's active enrolments**, then their programme modules, then explicitly published briefs and materials under that JWT. Database RLS remains mandatory.
5. Only metadata and safe record identifiers are returned, never file content, private object paths, signed URLs, another learner's work, marks, secrets or PII. Record limits fail closed rather than silently truncate.
6. Responses carry `Cache-Control:no-store`. No background ingestion, model calls, fine-tuning or third-party transmissions are performed.
7. All returned titles and descriptions must be treated as **untrusted data**, not instructions, when integrating with an LLM. Agents must cite verified record references and say when no appropriate source was available.

## Verified schema and limitations

The separate UniPathway Lovable project's database (not Dishbee) includes student enrolments, programmes, modules, published assessment briefs and module materials with row-level policies. This source review does **not** prove individual authenticated JWT access, document consent, real provider connectivity or staging readiness.

These endpoints are not connected to the public app or Omniqora tutor and cannot currently answer questions on behalf of a student. Do not advertise them as working user features until a deployment and acceptance test.

## Required release acceptance

- [ ] Keep the server feature flag **off** in production; approve and deploy only to an isolated UniPathway staging project first.
- [ ] Validate one student in centre A, uninvited peer A, student B in centre B, withdrawn enrolment, revoked student role, staff and employer JWTs.
- [ ] Verify tenant/role and RLS denial via direct PostgREST, including nonexistent and forbidden IDs. Do not accept missing tables or network errors as successful denial.
- [ ] Test 0, 1, 50, 51 and 101 records; verify failure states, pagination strategy and output budgets.
- [ ] Review per-user rate limiting and gateway restrictions; in-memory IP limits are only supplemental abuse control.
- [ ] If an MCP server is later added, use the **official v2** server SDK with an independently approved transport, authenticate every request, allowlist tools and prevent prompt-injection/tool-output escalation. No service-role API key in the browser.
- [ ] Human review and documented content-owner approval before an AI provider receives any academic source. Never infer funding, accreditation, grades, visa or placement guarantees.

## UX implementation

After authenticated staging validation, a learner may be offered a study-resource drawer with three next-action groups, source titles, Pakistan Standard Time deadlines, and links into already authorised module/coursework pages. Do not show the controls when the server gate or roles fail.
