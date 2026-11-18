# Course-enquiry context follow-through

## Change
- Keep the existing catalogue-to-application selection flow, secure-contact flag, Turnstile and submission receipt rules unchanged.
- Replace the restrictive Levels 2–5 learning-area label: Level 6 remains an advisory enquiry option, not a claim of approval.
- Show a contextual course-enquiry review heading and explicit approval/fee/intake boundary.
- Return to the study chooser with the allowlisted qualification, level and delivery mode. Do not put personal form fields, arbitrary URL values or availability claims into the edit URL.
- Resolve a recognised qualification's level from the catalogue rather than a contradictory query parameter.
- Update the outdated qualification E2E link expectation to follow the existing /apply intermediate step and test the return-to-edit round trip.

## Acceptance
Focused unit tests, TypeScript, lint and production build passed locally. Full-suite and remote CI results are recorded on the draft PR. Local lint reports existing warnings but no errors.

Local browser tests were attempted but could not launch because the required Chromium executable was missing. The supported Playwright browser install failed with invalid/truncated ZIP downloads. This is not a passing browser or visual result. Re-run the affected synthetic browser tests and responsive inspection in CI before release.

No live contact form submitted, legal identity wording changed, provider activated, migration applied or production deployment performed. A catalogue selection and successful synthetic checks do not establish an approved intake, real admissions receipt, enrolment, payment or hosted acceptance.
