# UniPathway Phase 1 — connected qualification enquiries and sidebar discovery

**Date:** 10 November 2026. **Release boundary:** UI, public catalogue handoff and authorised navigation search only.

- Qualification cards preselect their recognised public course and exact level in the existing /apply enquiry wizard.
- Learners may choose a preferred study format, then continue to the existing /contact enquiry service. URL inputs are validated against predefined options; they cannot introduce a fake public course choice.
- Changing study area or clearing a course removes its stale context. Level 6 catalogue choices are supported.
- Role-specific sidebar search accepts all search words in any order and announces its results.

**Not included:** domestic enrolment approval, awarding-body authorisation, student document upload, live database migrations, any provider provisioning, or contact service activation. An enquiry is not a confirmed application.

**Acceptance:** Run lint, typecheck, units, database tests, build and browser acceptance on the exact PR head. Manually review 360/390/768/1440px; 200% zoom, keyboard and screen reader; dark/light; Level 4/Level 6 qualification handoffs; invalid course links; form failure and confirmed receipt; student and IQA navigation searches. Verify production contact configuration separately, without inventing success.
