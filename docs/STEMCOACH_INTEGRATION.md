# STEMCoach x UniPathway Integration

Existing STEMCoach remains its own product/app and repository. UniPathway grants entitlements; it does not duplicate STEMCoach's question bank/tutor engine.

## Pakistan enrolled students
An active eligible UniPathway enrolment can grant STEMCoach access mapped to the learner's course/subjects. Entitlement lifecycle follows enrolment: pending -> active -> suspended/expired/revoked. Access is not based only on a client-side promo code.

Pakistan-facing positioning may use approved co-branding such as "STEMCoach in partnership with UniPathway" plus named school-system partners only after written permission/brand approval. Partner campaigns are region/eligibility/time gated.

## Direct/public users
Users who are not covered by a UniPathway or partner entitlement follow STEMCoach's normal paid/free commercial rules. Non-Pakistan campaigns can use separate pricing, partnerships and messaging without changing Pakistan institutional entitlements.

## Identity/SSO
Preferred future flow: UniPathway authenticated learner -> server verifies active enrolment/entitlement -> short-lived signed SSO handoff or shared identity federation -> STEMCoach maps external user and curriculum access. Never put a reusable entitlement secret in the browser.

## Curriculum mapping
Map UniPathway course/module/subject to STEMCoach curriculum identifiers. Existing STEMCoach scope includes STEM subjects and broader subject-coach architecture; Pakistan tuition tracks include board-specific separation. Only expose content that has been mapped/reviewed for the learner's curriculum.

## Analytics
Return only necessary learning signals to UniPathway: activation, subject/course, mastery/progress, practice activity and intervention flags as permitted. Parent/teacher views remain role/relationship gated.

## Promotion
UniPathway student dashboard/app can show included STEMCoach benefit and app-install CTA. STEMCoach can show region-aware partner banners. Do not claim a school partnership until contracted.
