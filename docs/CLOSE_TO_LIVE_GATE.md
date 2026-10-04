# Close-to-Live Gate

Software feature breadth is not the launch criterion. Launch requires evidence.

## Automated/code gates
- CI install/lint/unit/build green
- migration replay from empty database
- generated database types aligned to deployed schema
- authenticated RLS/IDOR tests for every role and cross-tenant negatives
- private storage tests for CNIC/qualifications/submissions/evidence
- Edge Function authentication/authorization/service-role review
- Playwright critical journeys desktop + mobile
- backup and restore drill
- monitoring/error reporting/health checks
- load test representative of 3,000 learners

## External integration gates
Microsoft Education/Entra/Graph; payments/bank/mobile wallet; institutional email; NADRA when approved (manual KYC fallback otherwise); STEMCoach SSO/progress sync; Turnitin/integrity provider if contracted; virtual-lab provider credentials; CCTV/access hardware integration; Apple/Google signing for native release.

## Academic/operational gates
Awarding-body/centre approvals recorded before marketing claims; launch-course specifications and Student/Teacher/Assessment/QA packs approved; marker/IQA capacity; safeguarding/privacy/CCTV/retention policies; residential-week SOPs; placement partner verification; exam controls; pilot cohort and incident/evacuation exercises.

Production Readiness UI must show blocked/pending rather than inferring green from code existence.
