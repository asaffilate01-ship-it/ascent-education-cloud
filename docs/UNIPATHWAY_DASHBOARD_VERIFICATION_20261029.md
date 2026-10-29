# UniPathway dashboard verification — 29 October 2026

## Verified account repair

All 17 supplied accounts exist with their expected roles. Eleven existing profiles had no centre assignment. The allowlisted, null-only repair in `scripts/activation/reconcile-unipathway-dev-centres.sql` was rehearsed with rollback, then committed under the existing supplied superadmin actor. A separate read confirmed 17 profiles: 16 assigned to UniPathway, with the superadmin global. No passwords or role grants were changed; protection triggers remained enabled.

## Hosted role read probes

These checks used transaction-local authenticated database roles and each supplied user's UID, then rolled back. They tested a maximum of one row per directly referenced home-page table; no returned row content was retained. A successful read does not prove browser login, expected record visibility, selected-column compatibility, writes, cross-tenant denial, child components or external integrations.

| Role | Home | Direct table probe |
|---|---|---|
| superadmin | /landlord | applications: read succeeded; invoices: read succeeded; tenants: read succeeded |
| centre_director | /director | applications: read succeeded; attendance_records: read succeeded; invoices: read succeeded; programmes: read succeeded; student_enrolments: read succeeded |
| admissions_admin | /admissions | applications: read succeeded |
| lecturer | /lecturer | modules: read succeeded |
| assessor | /assessor | uni_marking_drafts: read succeeded |
| programme_leader | /programme | modules: read succeeded; programmes: read succeeded |
| iqa_officer | /qa | assignments: read succeeded; submissions: read succeeded |
| awarding_body_eqa | /eqa | modules: read succeeded; profiles: read succeeded; programmes: read succeeded; submissions: read succeeded |
| welfare_officer | /health | health_records: read succeeded; profiles: read succeeded |
| exams_officer | /exams | academic_events: read succeeded |
| finance_officer | /finance | invoices: read succeeded |
| marketing_officer | /marketing | applications: read succeeded |
| agent | /agent | applications: read succeeded; invoices: read succeeded |
| student | /student | modules: read succeeded; programmes: read succeeded; student_enrolments: read succeeded; unipathway_assessment_grade_amendments: read succeeded; unipathway_assessment_released_results: read succeeded |
| parent_guardian | /parent | Shared-results RPC returned an array under parent identity |
| university_partner | /partner | applications: read succeeded; partner_universities: read succeeded; programmes: read succeeded |
| employer_partner | /employer | unipathway_employer_applications: missing relation; unipathway_employer_memberships: missing relation; unipathway_employer_opportunities: missing relation |

## Code fixes in this change

- Resolve lazy imports in the route audit, list all 18 configured role homes (the supplied test list covers 17; security is additional), and fail if a role home has no source page.
- Marketing: distinguish loading and failed data from zero leads; add retry; replace the inert campaign button with a link to the existing email campaign workflow.
- Marketing monthly chart: sort calendar months chronologically, keep years separate, and ignore invalid dates.

## Remaining deployment gaps and ordered next phases

1. Reconcile the hosted lab schema in an isolated copy before deployment. `lms_lab_offerings`, `lab_templates`, `lms_lab_class_invitations` and other modern lab relations are absent. Hosted `lab_sessions` is a legacy classroom table with mandatory title/lecturer fields and tenant-wide read policies. It currently has zero rows, but changing it still affects existing application contracts. A direct replay would skip its creation and then reference absent student/template columns. Modern attempts also require narrower participant authorization than the legacy policies. Do not replay the fresh staging bundle into this database.
2. Rehearse a forward-only classroom/whiteboard delta against the actual hosted schema. `lesson_whiteboards` remains absent. The previously merged unavailable/retry interface does not deploy that backend.
3. Deploy the employer portal schema after checking its full prerequisites and tenant/member policies: `unipathway_employer_memberships`, `unipathway_employer_opportunities`, and `unipathway_employer_applications` are absent. The employer dashboard is not operational merely because its account now has a centre.
4. Run actual signed-in browser journeys for all 17 supplied accounts, including role navigation, empty/error/retry states, intended writes and cross-tenant denial. The current runtime has no DEV_ACCOUNT_PASSWORD; no password reset was performed. Existing staging role-contract scripts must retain their production refusal guard.
5. Verify AWS gateway deployment, provider readiness and explicitly approved capacity/budget before enabling launches. No paid AWS resources or provider activation were started by this work.

## Scope of prior requests

Pearson Fine Art Levels 4/5, women’s crafts and enterprise courses, sewing/tailoring, and Foundation funding content were merged in prior changes. This report does not assert current live publication or academic approval. UI UX Pro Max was consulted previously; no claim is made that every dashboard now implements every recommendation.

