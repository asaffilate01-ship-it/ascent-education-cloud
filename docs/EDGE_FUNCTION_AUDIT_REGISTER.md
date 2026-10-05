# Edge Function Security Audit Register

Status meanings: Built = function exists; External = provider activation required; Probe = functional integration test required.

| Function | Auth | Tenant/RLS | Rate limit | External | Status |
|---|---|---|---|---|---|
| nadra-identity-connector | yes | user token/RLS | yes | NADRA | External + Probe |
| microsoft-education-provision | yes | authenticated boundary | yes | Graph | Implementation incomplete |
| lab-provision | yes | user token/RLS | yes | lab providers | Adapters required |
| create-education-payment | review | review | review | payment providers | Review required |
| omniqora-education-event | yes | user token/RLS | yes | central Omniqora | Local built |
| omniqora-student-intelligence | yes | user token/RLS | yes | none | Local built |
| omniqora-cohort-intelligence | yes | user token/RLS | yes | none | Local built |
| omniqora-education-retrieve | yes | permission-first corpus | yes | semantic gateway | Local boundary built |
| omniqora-knowledge-index | yes | approved docs/RLS | yes | AI/vector gateway | Local boundary built |

Before launch expand this register to every privileged Edge Function and attach review/test evidence.
