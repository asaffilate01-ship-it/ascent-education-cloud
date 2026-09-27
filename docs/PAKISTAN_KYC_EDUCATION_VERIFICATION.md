# Pakistan Identity & Education Verification

## Identity
Mandatory Pakistan onboarding supports CNIC, NICOP, POC, Juvenile Card/CRC where appropriate, plus passport where needed. Front/back document capture remains available, but direct NADRA verification is the preferred production path.

NADRA's public materials confirm Verisys supports CNIC/NICOP/POC verification, institutional onboarding through Nishan Pakistan, API-based verification options and PakID SSO. The connector is deliberately endpoint-agnostic until UniPathway receives its approved institutional API pack and credentials. No undocumented endpoint is hard-coded.

## Consent and privacy
Verification starts only after explicit student consent. Store the result/reference and minimum authorised attributes. Do not store raw fingerprint/face biometric templates in UniPathway.

## Education evidence
Require the complete entry-relevant chain: SSC/Matric or O-Level/equivalence; HSSC/Intermediate or A-Level/equivalence; diploma/degree/professional evidence where it forms the entry basis. Store certificate/transcript/DMC evidence and verification status separately.

## Agents
- Identity Orchestration Agent: selects CNIC/NICOP/POC flow and NADRA/manual fallback.
- Credential Extraction Agent: extracts institution, board/university, qualification, dates, roll/registration/certificate numbers, grades and subjects.
- Consistency Agent: compares legal name, DOB and identifiers across identity and education evidence.
- Education Verification Agent: routes evidence to the appropriate authoritative verification process and records references.
- Eligibility Agent: compares verified credentials with the controlled programme entry requirements.
- Human Review Agent/Queue: routes discrepancies, uncertain authenticity, missing predecessor qualifications and conditional cases to Admissions.

AI may extract, compare and flag; it does not declare a document authentic or reject a student without the configured authoritative/human verification step.

## Admission gate
APPLICATION -> ID DOCUMENTS -> CONSENT -> NADRA VERIFIED/MANUAL VERIFIED -> EDUCATION VERIFIED -> ELIGIBILITY REVIEW -> OFFER -> ENROLMENT.
