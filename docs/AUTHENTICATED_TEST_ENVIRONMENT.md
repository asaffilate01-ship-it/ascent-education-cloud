# Authenticated Test Environment Contract

To convert route/unit contracts into genuine E2E evidence, CI/staging needs disposable test identities and a non-production Supabase project.

Required identities: tenant A student, lecturer, assessor, IQA, finance, employer, centre director; tenant B student and centre director. Credentials must be CI secrets, never committed.

Required assertions:
- each user reaches their correct home and permitted workflows;
- student A cannot query student B or tenant B;
- lecturer cannot release summative results;
- assessor cannot mark unallocated work or release results;
- finance cannot change academic decisions;
- employer cannot browse unrelated learners;
- centre director A cannot access tenant B;
- private KYC/assessment objects cannot be fetched without authorised signed access;
- direct REST/RPC calls are tested in addition to browser navigation.

A successful browser-only test is not sufficient to pass the RLS readiness gate.
