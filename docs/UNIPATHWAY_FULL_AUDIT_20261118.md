# UniPathway — full source, CI and connected-backend audit
**Evidence collected:** 18 November 2026. **Project:** `asaffilate01-ship-it/ascent-education-cloud`, Lovable UNIPATHWAY `2c97a03a-f146-4ff5-a22b-3765cf2f538f`.

## Executive disposition
**Not approved for unrestricted student/centre production launch.** The public Lovable project is published and source CI can pass, but the connected database's readiness register has **65 pending checks, 0 current evidenced passes and 26 integrations marked `not_configured`**. A source merge, staging rehearsal, browser fixture, published homepage and native build do **not** establish operational readiness, regulated-course approval or production-provider activation.

Evidence classes: **G** = verified GitHub source/CI, **D** = read-only connected Lovable database metadata, **R** = repository operational documentation, **U** = unverified outside those sources. Counts are snapshots and may change.

## Verified engineering inventory
| Scope | Evidence | Conclusion / limitation |
| --- | --- | --- |
| Source routing | G | 21 UserRole variants and 315 unique literal application routes; guards, permissions and operations must still be tested as authorised personas |
| Source backend | G | 49 Edge Function directories; live deployment/version/secret configuration not certified |
| Migrations | G+D | 205 timestamped source SQL files; deployed migration ledger has 31 versions, all of which are represented in source. **174 source versions are absent from the ledger**. Older source migrations may be replaced by a baseline; this is not a safe instruction to replay 174 files |
| RLS | D | 118/118 `public` base tables have RLS enabled; 247 public policies on 112 tables. Six RLS-enabled tables have no direct policies: `study_tutor_usage`, `uni_mail_cursors`, `unipathway_admission_handovers`, `unipathway_guardian_result_consents`, `unipathway_guardian_scope_consents`, `unipathway_learning_shares`. This normally denies direct access; verify intentional RPC-only access |
| Views | D | 5 public views have `security_invoker=true` |
| Functions | D | 133 public functions, 125 `SECURITY DEFINER`, 25 executable by `anon`. These grants require review and direct JWT tests; numeric count alone does not prove exploitation |
| Storage | D | 7 storage buckets: 5 private (`kyc-documents`, `submissions`, `unipathway-comms`, `unipathway-coursework`, `unipathway-module-materials`) and 2 public (`avatars`, `resources`). Some have no configured MIME/size allowance; review business purpose, object access and upload abuse |
| Production readiness | D | 65 checks `pending`, none `pass`; 26 integration records `not_configured`, none `healthy`. This is *recorded state*, not live endpoint probing |
| CI | G | `main` at `765a6d3` failed in every job at npm installation because two Lovable dev dependencies were absent from `package-lock.json`. Phase 16 PR #222 reconciles exact public package integrity and passed all PR checks before merge; verify new main-head CI separately |
| Mobile UX | G+R | Student navigation has task-led Today/Learn/Assessments/Progress/Support (Phase 15); broader real device, screen-reader, offline and 200% zoom acceptance remains U |

## P0 — release and security blockers, in strict order

1. **Review elevated SQL function grants in private security review.** Connected-backend metadata identified an internally intended privileged helper with anonymous execution permission and insufficient caller-scoping evidence. Restrict execution in a reviewed isolated staging change, verify all authorised triggers and service paths, capture rollback evidence and deploy after approval. Do not publish function bodies, access paths or reproduction instructions in this public source repository.
2. **Audit anonymous-callable security-definer functions.** Independently inspect the 25 exposed functions for documented business need, caller/centre scope, read-data minimisation, rate limiting, safe search paths and revocation risk. Some are intentional public lookups, and some support RLS policies. Restrict only after dependency mapping, documented tests and owner approval. Track specific findings in a private security handoff rather than a public issue.

3. **Migration parity and recovery.** Export/back up the real database, rehearse a verified restore to an isolated staging database, inventory exact table/function/policy differences versus source, and identify a *reviewed forward-only baseline*. Never execute the 174 unrecorded migrations blindly, and never overwrite the connected live database with fresh-staging fixtures.
4. **Authenticated isolation.** Test all 21 active roles in two independent centres with actual JWT/RLS, including guessed IDs, role revocation, storage signed URL expiry, enrolment/sponsor/guardian consent, employer permission, global/centre scoping, session and cache isolation. Synthetic PGlite and browser fixtures are important but not equivalent.
5. **Re-establish evidence-gated launch.** CI on exact main SHA, production deploy parity, API/Edge versions, restore drill, incident escalation, monitored errors, compliance/retention and signed live-owner acceptance. Do not mark a readiness item passed without a stored evidence reference and expiry.

## P1 — provider activation and complete workflows
| Workstream | Recorded condition (D/R) | Acceptance before marking enabled |
| --- | --- | --- |
| Microsoft 365 Education / Entra / Graph / Teams | Required integration entries `not_configured` | Verified domain/licences/organisers/admin consent; live class scheduling, independent invitation access, cancellation, recording worker, retention and failure recovery |
| Institutional payments / Pakistan bank or wallet | Required payment records `not_configured` | Merchant contract; server-side signed callbacks; invoice ownership, actual bank settlement, refunds, sponsor liability and idempotent reconciliation |
| Resend / institutional email / WhatsApp | Institutional email required but `not_configured`; repository lists provider credentials/verified domain as outstanding | Provider credentials in server secrets, real inbox delivery, consent/unsubscribe, email verification/reset and opt-in WhatsApp/SMS; never fabricate delivery |
| Public enquiry and marketing | Turnstile activation and approved contact details remain outstanding | Working challenge, real enquiry delivery, error recovery, dedupe and privacy consent; no invented phone, address or testimonials |
| STEMCoach entitlement and sync | SSO/progress sync required records `not_configured` | Signed SSO, revoked-user denial, entitlement expiry and progress round-trip |
| AWS tech labs and language rooms | Provider and lab integrations `not_configured`; browser practice exists | Isolated provisioned environment, capacity, cost controls, TTL cleanup, headset/microphone and real multi-user classroom tests |
| NADRA / CCTV / physical security | `not_configured`; not necessarily required for the first online pilot | Authorised provider agreement or documented manual identity verification, private hardware gateway, limited evidence access |
| SEO and public website | PR #146 open; HTML metadata output ≠ full crawl validation | Confirm production canonical routes, body content rendering, Google/Bing crawl, mobile Core Web Vitals and accurate legal details |
| Employer/privacy and careers | Draft PR #149 and separate employer-logo PR #103 open | Review consent, centre and job/applicant access against policy; do not display unverified employer endorsements |

## P1 — education and regulated delivery
- **Admissions:** verified programme/version and eligibility → application/document review → human-approved offer → funding or payment clearance → *separate* superadmin enrolment activation; no agent shortcut.
- **Courses:** maintain per-centre approval and awarding-body evidence for OTHM, Qualifi, Pearson BTEC, ATHE and any eligible SIA, vocational, CPD, Pearson Edexcel or Pakistan-board delivery. A public ATHE source link or SIA enquiry is **not** authority to enrol or issue an award. Independently verify government-funded programme eligibility, staff/assessor/centre conditions, assessment methods and programme materials rights.
- **Independent assessment:** preserve student attempt receipts, human assessor judgement, private criterion evidence, separate independent IQA release, feedback amendments and appeals. Provisional/AI drafts must never appear as official grades.
- **Fortnightly IQA sampling:** current `src/lib/qa/fortnightlySampling.ts` is a pure source-only proposal. Needs awarding-body-specific policy, approved DB migrations, complete server candidate extraction, crypto draw provenance, reviewer conflict prevention, idempotent scheduler, auditable corrections and real `/qa/sampling` acceptance. Do not assert sampling is running.
- **Staff and physical-centre operations:** assessor/IQA competence, safeguarding, exam custody, class/attendance correction, placements, funding, transport, centre safety and residential policies must have authenticated negative tests and actual operators before launch.

## P2 — functionality, mobile, AI and performance
- Consolidate lecturer and director navigation as done for students, without losing role-authorised paths; test explicit back-navigation, 360/390/768/1440px, 200% text, screen readers, keyboard and real Android/iOS.
- Provide truly connected dashboard flows for next class, published lessons, draft/resubmission recovery, pending IQA, fees, messaging, student support and guardian-shared views. Loading, no data, denied, provider failed and offline remain distinct.
- Use approved-source, centre/learner-scoped AI retrieval with exact source/version citations and human handoff; evaluate model outputs against PII, hallucination, prompt injection and rubric accuracy. No autonomous grade, visa, funding, safeguarding or employee decision.
- A future MCP server must run server-side with session-bound allowlisted **read-only** tools, audit and rate limits. No browser service-role keys or cross-tenant retrieval.
- Load-test at the agreed 3,000 learners and peak marking/chat/notifications with recovery, observability, pagination and controlled paid-provider budgets.
- Complete native signing, push opt-in, safe-area, crash reporting and distribution approval; a green Android/iOS source build alone is not a shipped app.

## Delivery sequence and definition of done
| Stage | Engineering output | Gate |
| --- | --- | --- |
| 16 — immediate CI repair | Lockfile parity for preview plugins; all PR checks green and squash-merge | Exact-main CI after merge |
| 17 — preflight/audit hardening | Dependency-free lock drift preflight, documented live findings and staged privilege-remediation proposal | Green PR CI; **no production DDL** |
| 18 — production schema/security | Isolated backup/restore, function grant remediation, migration parity, two-centre role/RLS and storage tests | DBA/security-approved run and negative JWT evidence |
| 19 — academic and admissions | Real application/offer/funding-to-activation journey, qualification/version/rights and approved sampling workflows | Program-specific legal/awarding-body and assessor/IQA signoff |
| 20 — connected operations | Microsoft, payment, institutional email, STEMCoach and selected laboratory activation | Provider-account acceptance and failure/rollback proof |
| 21 — design, mobile and scale | Role workflow UX, real-device accessibility, 3,000-learner load and incident response | Human pilot acceptance, publishing and monitored go/no-go |

### Audit boundaries
Read-only metadata and repository evidence were inspected; no user records, secrets or private academic files were extracted. No production database write, live credentials, real payment, Microsoft account, provider send or regulatory approval was attempted. Full manual penetration testing, browser screen-reader/physical device acceptance, hosted restoration and exact runtime infrastructure inventory remain separate tasks. This report records **what was observed** and **what requires proof**; it does not certify the whole application as safe.
