# UniPathway source wiring audit — 16 October 2026

## Verdict

The application has substantial working source-level workflows, but it is **not verified ready for production**. PR #22 contains the current increments; they have not been merged or deployed by this session. This audit inspected routes, callers, selected Edge Functions, database workflows and test configuration. It is not a full security certification, live provider test or complete migration replay.

## What is connected in source

| Area | Evidence | Remaining validation |
|---|---|---|
| Admissions and progression | `PartnerWorkflow.tsx` calls application RPCs and tenant-scoped referral writes; database guards enforce agreement, consent and state transitions | Signed contracts, route evidence and live role/browser journeys |
| Support and learner deadlines | `SupportDesk.tsx`, `GlobalProgression.tsx`, task editor and agenda use scoped database reads/writes | Deployed migrations and live learner/staff isolation |
| Partner documents | `partnerDocuments.ts` uploads private PDF evidence and registers it with an RPC | Real Storage upload/download HTTP policies and operational signature review |
| Knowledge | `KnowledgeLibrary.tsx` calls save/review/search RPCs with revisions and citations | Approved launch content and live permission tests; no OCR/vector/model answer pipeline |
| Launch readiness | Director/landlord routes expose evidence reviews, expiry gates and audit history | Evidence must actually be performed and recorded; UI does not establish live health |
| Factory event transport | `FactoryOperations.tsx` invokes `omniqora-factory-dispatch`; delivery leases, retry and receipt handling exist | Server credentials and matching Factory bindings; deployment; no scheduled dispatch or completed-job reconciliation |
| Stripe fee checkout | `StudentFees.tsx` and `RecordPaymentModal.tsx` invoke `create-checkout`; `webhook-stripe` exists | Credentials, signed webhook deployment, actual payment/ledger reconciliation. Distinct from institutional provider endpoint |
| AWS labs | `ITLabsDashboard.tsx` invokes `aws-lab-manager` | AWS credentials, resource-level authorisation/lifecycle/cost validation; generic labs are separate |
| Selected AI tools | Assessment, course builder, study assistant, predictive analytics and legacy grading have frontend invocations | Provider credentials, source/role checks, model evaluation and human release controls; calls do not prove safe live operation |

## What is incomplete or not called by the frontend

| Area | Source finding | Required work |
|---|---|---|
| Microsoft Education | `microsoft-education-provision` returns `ready_for_graph_provisioning`; no Graph request; no literal frontend caller | Implement approved Graph user/licence/classroom lifecycle, consent and institutional setup |
| Institutional payment rails | `create-education-payment` returns instructions or `provider_checkout_required`; no literal frontend caller | Actual provider checkout, signed callbacks and reconciliation, then UI connection |
| Generic virtual labs | `lab-provision` returns `provider_connector_required`; no literal frontend caller | Provider provisioning/launch/termination and UI connection |
| NADRA | Configurable endpoint/token adapter and manual mode; no literal frontend caller | Verify official institutional request/response contract and role controls before wiring/activation; do not assume credentials alone complete it |
| Partner APIs | Audited manual submissions exist; no implemented GEDU/ApplyBoard/awarding-body submission integration identified | Contracted provider access and verified adapters |
| Intelligence generation | `omniqora-student-intelligence`, `omniqora-cohort-intelligence`, `omniqora-executive-snapshot` reference `auth.tenant_id`, absent from `_shared/auth.ts` | Resolve tenant from trusted scoped data, enforce roles, test actual function runtime |
| Cohort/executive metrics | Cohort generator ignores requested cohort membership and reads all visible snapshots; numeric conversion treats null as zero; executive reads omit error checks | Correct membership/metric definitions, missing-data handling, complete reads and failure semantics before activation |
| Education retrieval wrappers | No frontend calls found for `omniqora-education-retrieve` or `omniqora-knowledge-index` | Not a broken search UI: current knowledge UI uses database RPCs directly. Decide whether external wrapper exposure is required |

## Delivery and security gaps

- `Production CI` runs installation, TypeScript, lint, database fixture tests, application tests and build. It does not run authenticated end-to-end journeys or Edge Function runtime/type checks.
- Existing Playwright files primarily test public pages and anonymous redirect behaviour. They do not demonstrate student/parent/marker/IQA/finance journeys or private Storage enforcement.
- `npm run test:db` uses a PGlite fixture and selected migrations, not the complete historical Supabase Auth/Storage migration chain. Its generated education types are not proof of full deployed schema parity.
- Messaging adapters (`send-email`, `send-sms`, `send-whatsapp`) exist. The inspected SMS adapter authenticates a caller but accepts arbitrary destination/body. Institutional recipient/role policy requires a separate security review before enablement; this audit did not send messages.
- Legacy JaaS classroom and lecturer grading invocations remain in source; verify their reachable routes and retirement against the Teams-only and specialist-marker policies before launch.
- Backup restoration, 3,000-learner load testing, provider callbacks, approved course content and awarding-body/centre permissions remain operational gates. None is inferred from a green build.

## Built in this phase

1. Leadership readiness now shows a filterable implementation/connection coverage panel, explicitly separate from live integration status and evidence.
2. `npm run audit:wiring` generates `UNIPATHWAY_FUNCTION_WIRING.md`: 40 functions, 14 with literal frontend callers and 26 without. Webhooks, scheduled jobs, dynamic invocations and external consumers are outside that scanner; absence is not proof of disuse.

## Priority order

1. Repair and runtime-test the three intelligence generators before adding callers; remove misleading aggregate/missing-data semantics.
2. Run full staging migrations, role/browser and private Storage tests, then review this branch for merge.
3. Complete Microsoft and institutional payment contracts and implementations; activate only after credentialed staging tests.
4. Verify NADRA/lab provider contracts and recipient/role restrictions; connect approved workflows.
5. Validate Factory dispatch and downstream completion with real tenant bindings, then schedule it and prove recovery.

No live environment state or secrets were inspected. No migration, merge, deployment, message or external provider request was performed.

## Subsequent repair pass — 16 October 2026

The intelligence tenant-resolution, cohort-scope, missing-data and source-error defects above have been repaired in source. Attendance now uses recorded marks, unsupported metrics remain unavailable, and tenant-scoped staff authorization precedes service writes. Historical findings above describe the pre-repair state. See [functional verification and remaining gaps](UNIPATHWAY_FUNCTIONAL_CHECK_2026-10-16.md) for exact semantics, test results and unverified runtime areas. Playwright configuration is repaired; browser execution remains blocked by the Chromium download. Production CI now includes the three repaired intelligence functions in a Deno type check against the installed SDK.
