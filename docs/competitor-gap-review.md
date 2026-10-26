# UniPathway competitor and experience review

Reviewed 25 October 2026 against source through PR94 (`63d705b`), the live database catalog, public-page browser checks, and vendors' official product/help material. Competitor claims describe their documented offerings, not a hands-on test of paid accounts. Features and availability vary by edition and configuration. “Not found” means not evidenced in the inspected implementation, not proof that no related code exists anywhere.

Implementation updates: [Connected learning release](connected-learning-release.md) and [Scheduling, follow-up and navigation release](scheduling-followup-release.md). The evidence below is the original review snapshot; these release notes track subsequent delivery and remaining acceptance work.

## Main finding

UniPathway has substantial breadth: admissions, role-specific workspaces, modules, materials, classroom invitations, recorded lessons, assessment/IQA, guardian consent, tuition practice, labs, placements and agent workflows. Its largest deficit is consistency and live operational completeness. Adding another collection of dashboards before connecting existing journeys would make navigation worse.

The most useful benchmark combines Classter/Classe365's unified student administration, Canvas/Google Classroom's daily teaching workflows, and Synergy Spark's focus on navigation and resuming learning. Use Moodle/Open edX/iSpring for content portability and authoring requirements. Preserve the Pakistan audience, online/in-class delivery, original approved homepage hero, modest classroom imagery and Omniqora architecture.

## What each benchmark contributes

| Reference | Relevant documented capability | Implication for UniPathway |
|---|---|---|
| Classter | Admissions, one student record, attendance, billing, timetabling and role portals | Connect the full enquiry-to-enrolled-to-graduated record; avoid re-entry across services |
| Classe365 | CRM/SIS/LMS, subject workspaces, resources, quizzes, discussions and Teams/Meet/Zoom integrations | Give each course one coherent home; administrative setup should populate learning access |
| Canvas / Instructure | SpeedGrader, rubrics, gradebook, Blueprint courses, Commons, student/teacher/parent apps | A focused review workspace and governed reusable course templates; Instructure is the Canvas vendor, not a separate equivalent LMS |
| Google Classroom | Classwork, recently-due/to-review tasks, feedback and guardian summaries | A simpler daily classroom experience for tuition and parents |
| Moodle | Completion, cohorts/groups, activities, inline marking and SCORM/LTI interoperability | Standard content support, robust completion conditions and reusable activities |
| Open LMS | Managed Moodle-based platform | Benchmark supported deployment and operations; it is distinct from Open edX |
| Open edX | Authoring Studio, reusable libraries, modular sequences, assessments and LTI 1.3 | Structured course authoring, scalable content delivery and detailed learning analytics |
| LearnDash | Visual lesson/topic/quiz course builder | Organise and preview the curriculum without moving between many screens |
| LifterLMS | Course builder, prerequisites, drip content, certificates, memberships | Explicit release rules and simple package access |
| Teachable | Mixed lesson media, course player, coaching, memberships and learner mobile app | Clear lesson consumption and purchase-to-learning handover |
| Absorb AI | AI course drafts, assigned-content assistance, automation and integrations | Course-grounded assistance and administrative actions, implemented through Omniqora |
| iSpring LMS | Content uploads, SCORM, learning tracks, sequencing and reporting | Reuse existing presentations/content and make learner progress visible |
| Synergy Learning Spark | Moodle/Totara theme, simplified login, dashboard configuration, one-click resume | Design a consistent experience around next actions, not around all available features |
| D2L Brightspace | Accessibility tooling, audits and remediation | Test accessibility of teaching content as well as the application shell |
| Blackboard | Item-level progress and Start/Continue navigation | Resume the actual next lesson and distinguish opened from completed |
| Totara | Configurable learning plans, goals and competencies | Employer learning plans and manager review, after core student journeys are stable |
| Thinkific | Course-connected community spaces, events and moderation | Contextual discussion and moderated peer support; avoid an unrelated social feed |

## Evidence-based gap register

Status: **partial** = meaningful implementation exists but is incomplete; **deployment** = built code is not live-verified; **not evidenced** = a production implementation was not found in the inspected code; **UX** = usable functionality needs a simpler experience.

| Priority / area | Current evidence | What is missing or weaker | Completion test |
|---|---|---|---|
| P0 — Deployment and assignments | Live core RLS hardened in PR94; 28 modules but no enrolments, schedules or legacy sessions. Modern LMS tables differ from repository state | Reconciled deployment and a real approved staff/student/course/class roster | One student can use their course, another course is denied, reassignment/withdrawal revokes access across database, files and provider |
| P0 — All AI via Omniqora | Tutor adapter exists, but ai-course-builder, ai-study-assistant and omniqora-assessment-advisory still contain direct Lovable gateway calls | A single governed Omniqora connector for every AI feature, secrets/config activation, per-tenant budgets and auditability | No direct provider route remains; disabled/unconfigured AI fails clearly; fair-use limits and scoped context tested |
| P0 — Admissions handover | AdmissionHandover and complete_unipathway_admission exist in repository; public wizard now records a server-confirmed lead | Live-verified handover joining verified identity, eligibility, payer/funding, programme, class and account activation | Admissions can complete one learner without retyping data or manually fixing access |
| P1 — Course learning home | ModuleOverview, ModuleJourney, resources and assessment links exist | One ordered lesson workspace with inline player/document, exact resume point, completion and next activity | Returning learner reaches their next actual activity directly, not merely the module list |
| P1 — Staff action centre | Individual admissions/assessment/finance screens; director shortcuts improved | Unified prioritised queues, ownership, due dates, bulk actions and safe retry status | Staff can process pending work from one role-appropriate queue without opening multiple dashboards |
| P1 — Search and navigation | RoleWorkspace searches service links; CommandPalette and AdvancedSearch enumerate every role's navigation | Search restricted to permitted destinations and actual authorised course/resource/student records; remove categories with no data provider | Student search never suggests admin-only routes; staff search returns only permitted records |
| P1 — Scheduling | Demo ScheduleManager removed; real weekly records and conflict checks added | Unified recurring timetable and actual live sessions; room/cohort/capacity/travel constraints, substitutions, cancellations and server-side overlap handling | A schedule change updates invitations and notices and cannot double-book under concurrent saves |
| P1 — Course authoring | CourseFactory is primarily a review-status listing; AICourseBuilder produces generated output | Visual curriculum builder, reusable approved units, versioning, teacher/student preview and publish validation | Educator builds and publishes a usable module without editing code or manually joining records |
| P1 — Marking experience | IndependentMarkerQueue, rubric scoring, IQA and appeals already exist | Inline PDF/image/stylus annotation, reusable feedback bank and streamlined submission-to-rubric review | Assessor marks a submission in one workspace; IQA and release controls remain independent |
| P1 — Funding and fees | Invoices/balances and a funding screen exist; funding screen is not routed in App.tsx | Connected sponsor commitments, funded places, claim evidence, receivables/chasing and student liability rules | Late sponsor payment never wrongly suspends an otherwise entitled student |
| P1 — Mobile/low bandwidth | PWA/native-related code, responsive navigation and cache handling exist | Verified offline lesson downloads, resumable uploads/sync, file sizes, download limits and account-safe cache deletion | Student studies an authorised downloaded pack without connectivity and safely synchronises later |
| P1 — Accessibility | Several labels, error states and keyboard improvements exist; 32 responsive checks pass | Full keyboard/focus/contrast audit, captions, accessible documents, upload errors and assistive-technology testing | Key learner and staff tasks pass keyboard and screen-reader tests, including teaching content |
| P2 — Standards and external content | Repository search finds SCORM/xAPI as an unconfigured Settings entry, not a working content player | SCORM import/playback/tracking, LTI 1.3 launch and grade return, optional xAPI/LRS and H5P | Import a licensed package, launch it safely and persist progress/results correctly |
| P2 — Family tuition experience | Guardian scopes, result sharing, messaging and tuition learning plans already exist | Coherent multi-child home, plain-language progress, upcoming work, consent-aware summaries and attendance follow-up | Parent can answer “what must my child do this week?” in one screen |
| P2 — Tuition terminology | Public tuition describes Years 8–12; TuitionAcademy still says Years 9–12 | Consistent year/grade/board mapping, board-specific learning objectives and level labels | Same learner's year, board and subject appear consistently from admission to progress report |
| P2 — Learning analytics and interventions | Student360/Course360 and practice/progress components exist | Operational intervention ownership, explainable risk indicators and evidence-linked recommendations | Missed classes/work generates a reviewable support task, not an unsupported automated judgement |
| P2 — Identity, cameras and providers | NADRA status/connector and CCTV workspace exist | Approved provider credentials, consent/retention setup and provider-specific live acceptance | Verify identity or play authorised camera footage end-to-end with audit history; a UI label alone does not count |
| P2 — Course commerce | Enquiry/application routes exist | Configurable multi-subject tuition packages, eligible discounts, device bundle terms, instalments and refunds linked to access | Five-subject enrolment produces the correct fee agreement and course access without manual duplication |

## Flow redesign

### Learner

Today → selected course → next lesson → activity/assignment → feedback → next step. Keep class joining, released recordings and related resources inside the same course context. Persist the actual activity and playback position across devices. Do not equate opening a file with mastering its content.

### Admissions

Enquiry → assessment → verified documents → offer and payer agreement → programme/class assignment → activation checklist. Show why a step is blocked and who can resolve it. Preserve one learner record through the process. The new browser-local draft is useful, but it is not yet a signed-in cross-device application portal.

### Teacher and assessor

Teacher: today's teaching → roster/register → lesson resources → follow-up tasks. Assessor: allocated submissions → evidence and rubric → human decision → IQA. Do not make lecturers perform every assessment role by granting a blanket staff permission.

### Parent, agent and security

Parents start from the selected child and authorised information. Agents start from their own referrals and missing documents. Security starts from authorised sites/cameras and incidents. These users should not inherit the generic student or administrator menu.

## UI and visual direction

1. Keep the existing UniPathway blue/green identity, approved homepage hero, and Pakistan-appropriate imagery. Further hero-image replacement is lower priority than learning tasks.
2. Standardise page title, short purpose, one primary action and secondary actions. Put status, deadlines and next steps above statistics.
3. Reduce nested cards, tiny uppercase labels, repeated explanatory warnings and large stacks of equal-weight buttons. Use quieter surfaces and a consistent spacing/type scale.
4. Use a small stable role menu; move specialist tools behind grouped workspaces. Maintain the selected course, student or class when navigating between tools.
5. Make course cards comparable and actionable. Keep confirmed fees/dates distinct from enquiry placeholders. Keep long accreditation explanations in expandable details.
6. Treat mobile as its own layout: task cards instead of wide tables, touch-friendly controls, sticky relevant action, clear upload progress and a keyboard-safe form footer.
7. Separate useful empty states from failures. “No assignments” must never appear because an API call failed. Existing newer components do this; several older pages swallow errors into empty arrays and need the same treatment.
8. Provide clear task feedback: saved, pending upload, sent, awaiting review, needs correction and released. Avoid showing a successful state before persistence is confirmed.
9. Offer English/Urdu language support deliberately, including RTL layouts and translated operational messages, rather than changing only navigation labels. This remains an acceptance requirement to scope, not a delivered feature.

## Recommended order

1. Reconcile/deploy the existing learning schema, validate the roster and close remaining AI/provider bypasses.
2. Fix role-scoped search and join admissions, programme, class and resource access into one verified flow.
3. Build the lesson workspace with reliable resume/progress and improve teacher/assessor daily workflows.
4. Add the sponsor funding queue, complete parent tuition flows and consolidate scheduling.
5. Add standards-based content import, reusable curriculum templates and verified offline learning.

Avoid replacing the application with WordPress/Moodle solely to copy a feature list. Evaluate standards-based integrations where they save effort, while retaining UniPathway's centre operations and Omniqora services.

## Official references

- Classter: https://www.classter.com/ and https://www.classter.com/product/functionalities/student-information-system/
- Classe365: https://www.classe365.com/ and https://docs.classe365.com/en/articles/659490-learning-management-system-lms
- Canvas/Instructure: https://www.instructure.com/canvas and https://community.instructure.com/en/kb/articles/664521-what-is-commons
- Google Classroom: https://support.google.com/edu/classroom/answer/6020279 and https://support.google.com/edu/classroom/answer/9157286
- Moodle: https://docs.moodle.org/en/Features
- Open LMS: https://www.openlms.net/
- Open edX: https://openedx.org/platform/
- LearnDash: https://learndash.com/support/kb/styling/courses/course-builder/
- LifterLMS publisher listing: https://wordpress.org/plugins/lifterlms/
- Teachable: https://www.teachable.com/student-experience
- Absorb: https://www.absorbai.com/
- iSpring: https://www.ispring.com/features
- Synergy Spark: https://synergy-learning.com/services/spark-lms-theme/
- Brightspace: https://community.d2l.com/brightspace/kb/articles/33084-about-accessibility
- Blackboard: https://help.anthology.com/blackboard/student/en/course-content-and-materials/progress-tracking.html
- Totara: https://totara.help/19/docs/what-are-learning-plans
- Thinkific: https://www.thinkific.com/features/learning-communities/
