# Private Storage Verification

Sensitive buckets/classes: KYC/identity, qualifications, assessment evidence, practical evidence and recordings. They must be private by default.

Production test cases:
- anonymous URL fails;
- student cannot list/fetch another student's object;
- tenant A cannot fetch tenant B object even with guessed path;
- lecturer only receives authorised course/student artifacts;
- assessor/IQA access follows allocation/scope;
- signed URLs are short-lived and purpose-scoped;
- revocation/offboarding removes future access;
- object metadata does not expose full CNIC or secrets.

The unit matrix is preflight only. The readiness gate passes after these are executed against staging storage/RLS with retained evidence.
