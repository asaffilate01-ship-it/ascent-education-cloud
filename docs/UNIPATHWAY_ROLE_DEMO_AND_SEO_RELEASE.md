# Role-based UniPathway demo and production SEO

## Deployment boundary

The public /demo page lists the 21 known workspace roles. The selected role is a preference, never a permission. Both login paths display only roles verified by AuthContext after authentication (and institutional MFA where enabled). The shared header opens the same role chooser for multi-role users.

The requested demonstration identity is demo@unipathway.pk. Never create a shared multi-role or global owner account in the live education database. Do not put its password in source, build variables, URLs, issue bodies or public documentation.

To activate a working demonstration:

1. Provision an independently verified, disposable demo Supabase project and synthetic centre. Do not clone real student, employee, finance, welfare, CCTV, files, access tokens, API keys or provider data. The known production project ref is explicitly denied for this demo identity.
2. Deploy the same reviewed application from main to demo.unipathway.pk, with its own publishable key, matching separate VITE_SUPABASE_URL and VITE_UNIPATHWAY_DEMO_PROJECT_REF. Deny indexing at the hosting layer (X-Robots-Tag: noindex, nofollow); configure the demo host's CSP, redirects, storage, database policies and authentication separately. Use protected access, throttling and regular reset of sample data.
3. Use an authorised server-side provisioning workflow to create the demo identity, verified profile and centre-local role memberships, and a global platform-owner membership **only** in that isolated project. The password must be entered using the administrator's protected secret store. Keep real production MFA, RLS and role checks unchanged.
4. Seed fictional workflows for each role, including sample admissions, courses, assessments, guardian links, invoices and simulated external-provider operations. Do not enable real payment settlement, camera viewing, messaging, Teams provisioning, salary disbursement or other external side effects with production credentials.
5. Verify real demo authentication, each of the 21 role selections, every role home and secondary navigation destination, and backend read/write boundaries. Test across phone, tablet and desktop. Only after all checks pass, configure VITE_UNIPATHWAY_DEMO_ORIGIN=https://demo.unipathway.pk on the production website and publish the reviewed release. Until then the selector is visible but launching the demo is disabled. This branch does not provision the account or configure a hosting project.

## SEO and identity

Public page metadata remains catalogued in src/data/public-seo.json and generated into static page heads. Validate production serving of canonical paths, sitemap, robots, image MIME types and social previews after publication. The homepage describes Jhelum and Pakistan-wide tuition, IELTS, ACCA preparation, technology courses and qualification pathways without implying unverified awarding authority. Meta keywords are descriptive metadata, not a guarantee of Google ranking. New web install icons use the existing official mark; the separate maskable icon has safe padding. The existing branded 1200 x 630 social card remains in use.

## Research-driven next implementation

- Moodle (github.com/moodle/moodle): structured learning and accessible role-specific workspaces.
- openSIS and Fedena: admissions-to-enrolment workflows, role-specific menus and task-first dashboard summaries.
- OpenAI Agents SDK and MCP: scoped tools, human approval and audit tracing for administrative workflows.
- Claude SDK and Gemini SDK: server-side document and multimodal analysis, subject to approved credentials and evaluation.
- Qwen-Agent: evaluate multilingual retrieval and agent tools separately; do not assume provider activation.

Use these as architectural references, not as evidence of active integrations. Keep AI Study Tutor hidden. Verify each administrative AI action's identity, permissions, input handling, budget, audit and approval; never expose provider keys in the browser.

## Acceptance gate

The checked-in regression tests cover UI role selection, verified membership and demo origin restrictions, public SEO and icon format. They do not prove hosting, live database connectivity, operational provider credentials or complete dashboard functionality. Complete real-account acceptance before claiming the demo or all integrations are operational.


## Protected demo acceptance workflow

After the isolated demo is provisioned, use the manual GitHub Actions workflow **UniPathway Isolated Demo Acceptance (Manual)** from main. Configure the protected `unipathway-demo` environment with approved deployment reviewers before entering any secret.

Variables: `UNIPATHWAY_DEMO_PROJECT_REF`, `UNIPATHWAY_PRODUCTION_PROJECT_REF`, `UNIPATHWAY_DEMO_USER_ID`, `UNIPATHWAY_DEMO_TENANT_ID`.

Secrets: `UNIPATHWAY_DEMO_URL`, `UNIPATHWAY_DEMO_PUBLISHABLE_KEY`, `UNIPATHWAY_DEMO_ACCOUNT_PASSWORD`. The workflow accepts only a publishable or matching legacy anon key, never a service-role key.

The approved fictional centre must use slug `unipathway-demo`. The confirmed demo identity must be tagged by the trusted administrator with app_metadata.fixture_namespace = unipathway-demo-v1. The check verifies the expected account ID, profile, exact role memberships and centre, and an HTTP noindex header at the separate demo origin. It uses real password authentication and locally signs out; it creates or changes no application records. It cannot establish complete demo data isolation from inspection of those few fields; that must be independently certified before providing credentials. It will fail if the demo's applicable institutional authentication/MFA policies prevent the read. Do not weaken MFA to make this check pass. Use separately authorised real-account browser acceptance for MFA, all 21 dashboards, feature flows and provider safety.

To run, explicitly enter UNIPATHWAY_ISOLATED_DEMO_ONLY in the manual workflow. No workflow is triggered automatically by merging this release. Do not mark the demo active unless its independent isolation and full functional acceptance are verified.


## Demo role journey and account boundaries

The public selector supports shareable role preferences and four functional categories spanning all 21 role descriptions. Authenticated selection still depends exclusively on verified account memberships. A selected role never grants permissions.

A misconfigured demo hostname now fails closed before loading the application; the demo is online-only and does not register the application service worker. Demo sign-in accepts only the demonstration identity, and the main host rejects that identity. Registration, password recovery and shared account profile/password/MFA/deletion controls are restricted in the browser; administrator-managed MFA is still required wherever institutional authentication applies.

These browser safeguards do not replace database and authentication-provider enforcement. The isolated project administrator must prevent unintended credential mutations and external side effects at the server, use synthetic data only, and perform the protected acceptance workflow. No production accounts, passwords or permissions are changed by these updates.
