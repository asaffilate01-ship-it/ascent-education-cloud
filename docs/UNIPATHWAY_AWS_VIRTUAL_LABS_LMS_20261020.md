# UniPathway LMS: AWS, Coding, Data and Virtual Labs (20 October 2026)

## Objective
Give every appropriately enrolled learner access to practical exercises through their existing LMS account in three modes: (1) in-centre on a classroom laptop, (2) during an instructor-led Teams lecture, and (3) independent online/self-paced learning. Cloud access must be authorised separately from reading a course handout. A lecture can include **100+ learners**, but live workspaces should be limited to the approved provider's concurrency and budget rather than all launched automatically.

## Status and deployment boundary
- Implemented in **draft GitHub PR #47**, *not* published to production: module-linked learner lab catalogue, online/in-centre lab cohort scheduling, invitation RPC, self-study requests, notes and task submissions, tutor feedback/help queue, AWS provider readiness guard, capacity and quota checks, and RLS checks. Dedicated isolated database tests are part of `npm run test:db`.
- **No AWS account, AWS Academy membership, IAM role, sandbox VPC, AWS provider token, server-side launch adapter, verified provider quota, live credentials, live VM, classroom test cohort or real AWS charge** was created or verified here.
- Legacy `aws-lab-manager` was unsafe: it accepted browser-provided instance IDs, used a non-working AWS EC2 request protocol, and lacked server-side resource ownership validation. It has been changed to **fail closed (409)** on this feature branch. No AWS start/stop is assumed to work.
- As of prior live Lovable inspection, the connected production Supabase database held the *legacy* `lab_vms`/`lab_sessions` but not the later `lab_templates`, `lab_provider_configs`, `lab_class_runs`, class invitation or modern assessment tables. The separate existing staging Lovable database was empty. Stage migration parity and a backup before activating any feature. Do not apply this migration alone or directly to live production.

## Learning pathway
1. Admissions/enrolment records the student against an approved programme; each programme contains modules.
2. Lecturer prepares a lab template under one allocated module, chooses provider, sets time, attempt limit, learning outcomes, and creates ordered exercises.
3. Lecturer publishes the **syllabus/notes**. Students enrolled in that module can view the tasks and keep/save their self-study notes **even if external AWS access is not yet active**. Published syllabus ≠ AWS provisioning.
4. For a class-based practical: lecturer schedules a lab run, optionally links an existing Teams class, and invites all actively enrolled students in bulk. Class participants launch only their own authorised lab requests. The lead lecturer and TAs monitor the class support queue. Attendance in Teams and lab session minutes are distinct signals.
5. For self-study: student can request a lab when the module permits it, while currently enrolled, subject to attempts, duration, provider verification, monthly spend ceiling and total provider concurrency. Repeated requests return an existing active request rather than duplicating spending.
6. Student's note/submission remains private to the learner and authorised module teacher. Tutor feedback is not a final academic grade; summative marking and IQA/EQA release must use the secure assessment workflow.
7. A configured worker, not the browser, launches cloud environments under short-lived IAM privileges and records lifecycle, usage, TTL, cost and audit trails. **Worker/provider APIs are a separate stage.** Current requests stay `awaiting_provider`.

## Provider choices
### A. AWS Academy Learner Lab (low-cost institutional route)
Apply as an eligible institution; obtain educator approval and complete required onboarding. AWS Academy currently describes educator-created Learner Lab classes, student invitations, long-running student workspaces and analytics. AWS Academy's learner portal remains a separate provider; do **not** invent automatic SSO, student licences, API-based provisioning or seamless white-label embeddability. UniPathway LMS remains the authoritative course timetable, exercises, assignment, support and progress hub. Provider enrolments/credits are connected manually until contracted API functionality is verified.

Official institutional application: https://aws.amazon.com/training/awsacademy/

### B. Institution-managed AWS labs (custom automation)
Provision a **separate AWS sandbox account/organisation unit**, with **no linkage to production business systems**.
1. AWS Organizations and IAM Identity Center: separate instructor and learner permission sets and permission boundaries; dedicated limited lab services/regions/images/instance families. Never hand out AWS root/administrator credentials, secret keys or infrastructure IDs to students.
2. Server worker: use AWS SDK v3 / official APIs with short-lived STS role assumption, a fixed allowlist of permitted lab resources, and strict `tenant_id + module_id + student_id + lab_request_id` tags. EC2 may be used for specific Windows/Linux VM labs; lower-cost isolated containers/Jupyter are preferable for routine Python/SQL/coding.
3. AWS Budgets/Cost Anomaly Detection send alerts; **alerts do not enforce hard stops**. Add an independent EventBridge Scheduler/Lambda shutdown and resource sweeper, termination by absolute expiry, restricted launch templates, max instance families, network egress restrictions, encrypted ephemeral storage and full access logging. Validate spend in AWS billing, not just estimated LMS GBP reservations.
4. Verify official sandbox SSO/launch. Only after worker returns a server-signed, expiring launch reference to the authorised student may the portal show **Open workspace**. Browser must never pass AWS `instance_id` or arbitrary `connection_url` for start/stop.
5. Centre IT equipment: enrolled students log into their own SSO in supervised rooms on managed laptops; lab state persists in their workspace, not on public devices. On-site/online permissions are identical.

### C. Low-cost coding/Jupyter labs
Use JupyterHub, disposable containers, GitHub Codespaces/Classroom where licensed, SQL sandboxes and optional Azure lab providers behind the same LMS entitlement. The existing in-browser HTML/JS playground is a **demo only** and runs JavaScript in an isolated, opaque-origin sandbox; the current Python feature is a **limited simulation**, not real Python. Production work must use a real isolated execution service with per-student quotas, network controls, file persistence and no access to LMS secrets. AWS Cloud9 and CodeCatalyst are not appropriate for new accounts (both closed to new customers).

## Scale example (planning, not confirmed capacity)
- 120 students enrol in an AWS lab lecture; every student can view Teams teaching, course notes and self-study instructions.
- If AWS provider budget allows only 30 concurrent isolated labs, provision in four controlled waves (30×4) rather than launching 120 instances.
- Lecturer can combine lecturer-controlled screen demonstration, Teams Q&A, graded practical tasks and TA breakout support; students request cloud access asynchronously if a slot is available.
- Mark class launch requests as queued (never "active") until provider receipts confirm infrastructure. Show an explicit capacity/budget error rather than retry storm.
- Expected volume is determined by **students × VM/container type × hours × region × transfer/storage**. No cost claims are valid without provider price list, AWS account discount/credits and approved region.

## Permissions and RLS
- Students: SELECT published lab template/tasks only when **active enrolment** in the parent programme; class runs require explicit LMS lab-run invitation; view only own launch requests, notes and tutor support.
- Assigned lecturers/programme leaders/directors: create labs, publish materials, schedule sessions, invite cohorts, read assigned students' practice submissions and reply, but cannot silently grant cloud provider access.
- Assessor/IQA/EQA: not given blanket cloud workspace or student note access. Future rubric/grade release must be explicit, audited and separate.
- AWS operations and cost controls: service worker only with server-derived identifiers, provider role + API allowlist; signed expiry; no client database UPDATE of provider reference or request status.

## Course-data states
- **Published course tasks and handouts:** may be accessed during a valid enrolment without live AWS provision.
- **Self-study practice notes:** saves/editable draft → submitted → reviewed, with tutor feedback. Not an examination mark.
- **Workspace request:** `awaiting_provider` → `provisioning` → `ready` → `active` → `stopped`/`expired`/`failed`. Only the configured provider worker can progress these states. No worker has been activated.
- **Recorded lectures:** Teams video/whiteboard are distinct from AWS snapshots. Lab files and coursework require independent retention/backups before cloud resource shutdown.

## Critical release gates
1. Reconcile all 2026-09+ migrations into a backed-up isolated staging Supabase with two test tenants and proper 17 role fixtures. Test stored functions and RLS with an actual authenticated student/lecturer, not just SQL unit fixtures.
2. Verify an AWS Academy application/partner eligibility decision or an authorised AWS sandbox account, billing owner, role trust, resource policies, staging region and zero-secret browser interfaces.
3. Implement/test a real bounded provider worker using official APIs, idempotent provision/launch/stop/terminate, trustworthy cost telemetry, idle/TTL enforcement, egress limits, and emergency kill switch.
4. Run 25/50/100/150/300 student load tests, school laptop and home network performance, retry bursts, explicit cohort capacity, TA support and cross-tenant denial. Verify no overbilling and no lab accessible after withdrawal or session expiry.
5. Run CI, browser tests, real provider integration tests, data retention/assessment release and owner approval before merge/publish.

Sources:
- https://aws.amazon.com/training/awsacademy/
- https://aws.amazon.com/training/awsacademy/faq/
- https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html
- https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-developer-ide-end-of-support.html
