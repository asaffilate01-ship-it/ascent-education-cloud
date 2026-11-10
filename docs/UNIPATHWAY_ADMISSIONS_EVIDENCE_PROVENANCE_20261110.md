# UniPathway admissions evidence provenance — November 2026

## Change
The nine-check Admissions Review journey previously treated learner-wide invoice and electronic-signature rows as “recorded” evidence for a specific application. The current hosted schemas for `invoices` and `e_signatures` have learner/centre keys but **no exact `application_id`**. Therefore an unrelated invoice paid for another service, or a signature for general policy, cannot certify a student's offer, payment, sponsorship, or fee clearance for an application.

The read-only checklist now calls out these gaps clearly and **always requires independent human verification** for offer and finance. This is not a payment-processing change.

## Identity
A `kyc_documents` row is only presented as dated verified identity evidence when it has a verified status, valid non-future timestamp and a non-expired ID where expiry is supplied. The underlying KYC documents and academic prerequisites still require an authorised review. No client-side text acts as an approval.

## Enrolment
Only an active `student_enrolments` record matching the **exact application and programme** is described as a recorded academic handover. Stage drags, invoices and matching email addresses do not grant access. Existing reviewed `complete_unipathway_admission` RPC controls admission separately.

## Still required
Before any “confirmed fees / accepted offer” tag appears, introduce a separately reviewed application-level offer document + acceptance receipt and invoice/payment allocations, with tenant-scoped schema, audit history, RLS denial tests, staging migrations and staff separation of duties. No production table changes were executed here.

Acceptance: all source tests green, verified PDF/email offers from authoritative origin, two-tenant negative tests, human finance approval and actual settlement receipt, not platform sales stage alone.
