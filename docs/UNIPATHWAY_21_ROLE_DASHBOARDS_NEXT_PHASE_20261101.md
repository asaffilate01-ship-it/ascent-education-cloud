# UniPathway 21-role dashboard review — next phase (1 November 2026)
Source repository: `asaffilate01-ship-it/ascent-education-cloud`. This is a code and route review, **not** a claim that live UniPathway Supabase, Microsoft, AWS, partner integrations or private record RLS have been certified.

## Persona, verified source path, current review action
| Role | Home | Review / next handoff |
|---|---|---|
| Platform Owner | /landlord | Global role check before any cross-centre reads; audit centre lifecycle and billing provisioning |
| Centre Director | /director | Centre verification, admissions/finance/assessment operations and safe quality oversight |
| Admissions Administrator | /admissions | Centre application pipeline, KYC/offer/enrolment handoff; no drag/drop payment fiction |
| Lecturer | /lecturer | Assigned modules, Teams readiness, timetable, class end evidence and resource embargo |
| Office Administrator | /office | Personal capabilities, assigned tasks, delegated staff invitation readiness; activation off |
| HR Officer | /office | HR-only staff summaries and tasks; no salary or medical record default |
| Secretary | /office | Limited office tasks and schedule; no admissions or role grants |
| Programme Leader | /programme | Centre/role verified module management and independent QA handoff; no unauthorised IQA results |
| Independent Assessor | /assessor | Individually allocated attempts, private drafts, human marking and reviewer handoff |
| IQA / QA | /qa | **Improved:** 200-allocation snapshot with reviewer + centre conditions; no general submissions |
| Exams Officer | /exams | **Improved:** active role bound events; seating, registration and official results remain unconnected |
| Finance Officer | /finance | **Improved:** verified active role, remount on identity change, reject non-CSV export replies |
| Marketing Officer | /marketing | Centre aggregate-only fields; stage counts no longer masquerade as transitions |
| Recruitment Agent | /agent | Agent-assigned applications only; commission and offer authority not granted |
| Student | /student | **Improved:** active student role gates learner and released-grade requests; lab and recordings gated |
| University Partner | /partner | No learner data until verified institution, contract, consent and referral approvals |
| Employer Partner | /employer | Verified organisation's opportunities only; candidate disclosure consent not bypassed |
| Parent / Guardian | /parent | **Improved:** verify active guardian membership; separately verified sharing RPC |
| Awarding Body EQA | /eqa | No unapproved private evidence or learner samples; activation gate remains closed |
| Welfare Officer | /health | Centre enrolments + private health; **improved:** verified update receipt for student self-service |
| Security Officer | /security | Centre-scoped CCTV gateway with recording/provider activation unverified |

## Delivery state, risks and next integration gates
- **Source changes in this phase:** IQA allocation-scoped workload/home; programme, exams, finance, student, guardian, welfare and platform active-role checks; source regression tests and dashboard chart truthfulness.
- **Source-only / not activated:** office personal permission RPC, staff invites, Tech/AWS lab entitlements, Teams/whiteboards, counseling/anonymous wellbeing, recorded lessons 24h normal / 12h exceptional release, awarding-body rights and EQA samples.
- **P0**: Authenticate every one of the 21 test roles with real UniPathway JWT in two distinct centres, then direct PostgREST/RPC/Edge and signed-URL negative tests, including role revocation and centre switching.
- **P0**: Verify the **correct** UniPathway Supabase project and actual migration ledger. Never run forward patches against Dishbee or replay historical migrations automatically.
- **P1**: Exam candidate registration and invigilation; finance reconciliation/refunds/commissions; independent sampling and integrity cases; secured progression and employer consent; office/reception and safeguarding incident workflows.
- **P1**: Real Microsoft tenant/Graph organisation setup and scoped Teams meeting permissions, storage lifecycle and AWS budgeted provisioning for entitled modules.
- **P2**: Live end-to-end acceptance, accessibility, native, load/capacity and disaster-recovery drills, then phased activation.
The active page role and centre checks are additional *defence in depth* only; server RLS and authenticated provider actions are mandatory.
