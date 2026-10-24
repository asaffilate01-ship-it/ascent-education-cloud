# Focused workspaces — 24 October 2026

## Implemented in this release

- Shorter homepage introduction, four starting pathways and a full-catalogue link. Course navigation reduced to seven initial choices; complete destination catalogue remains in the footer and study pages. Removed hardcoded September intake. Menus use explicit click, Escape and outside-click dismissal.
- Course search now explains an empty result and offers filter reset.
- Student, lecturer, director and platform-owner navigation begins with at most seven daily destinations. Additional authorised pages remain searchable and expandable. Exact route matching avoids multiple active destinations. Icon controls have accessible labels.
- Student agenda appears before module summaries. Plain-language progress guidance and adjacent classes/materials/library/recording links reduce sidebar hunting.
- Director next actions use actual deposit-stage and overdue-invoice counts. Platform next actions link onboarding, readiness and infrastructure; removed fabricated educloud.pk centre domains.
- Lecturer preparation/materials/recording-review actions and adjacent teaching navigation replace an unavailable student metric with an actionable link.
- Parent overview, progress, attendance, schedule and messages have distinct views. Activity supports learner selection, loading, empty/error/retry states. Existing server-side independent consents remain authoritative. Switching page/account remounts private activity. Result revocation tests remain in place.
- Classes separate upcoming/past sessions, support refresh and give a useful recovery action. Existing 200-session fetch limit remains; this is not an unlimited historical archive.
- Assignment transport failures retain drafts, clear busy state and explain ambiguous submission confirmation. Account changes remount the workspace. Assignment refresh preserves the current draft.

## Verification and limits

447 unit tests passed before the final presentational lecturer changes; final CI is authoritative. TypeScript and production build passed. Lint has existing warnings and no errors. Local Chromium installation failed because its downloaded archive was invalid; browser acceptance must run in CI before merge.

No database schema or permission changes are included. Latest main's external lockfile updates are preserved. Supabase list_migrations was retried and returned permission denied. No hosted migration, worker activation or live provider/device acceptance is claimed.

## Work still required to complete the broader request

1. Hosted schema reconciliation and forward-only production changes, Edge Functions, Storage and role-based acceptance via an authorised Lovable/Supabase session.
2. Microsoft tenant configuration, organisers, app consent and recording-worker deployment; real class and withdrawal tests. Saved group plans still do not execute Teams microphone/breakout commands. Private intercom and the physical 20-seat pilot remain separate work.
3. Complete the course catalogue's verified availability, fees, intakes and maintained editorial review dates. Avoid deriving approval/availability from a marketing page. A level/delivery filter needs authoritative course metadata.
4. Unify overlapping legacy results/resources screens behind course and lesson context; retain old links until replacements preserve access and behaviour.
5. Add attachment support to the actual independent-coursework workflow, with storage and assessor access policies. Native camera support in the legacy uploader is not evidence this is complete.
6. Durable server-side recovery for partially created centres; live invitation/import acceptance; actionable admin queues and provider readiness based on real deployment observations.
7. Programme-specific syllabus/brief/marking/IQA/appeal acceptance with authorised staff. Do not infer readiness from route availability.
8. Physical Android/iOS testing, OAuth redirects, FCM/APNs worker activation, signing and store submission. No provider credentials or signing accounts were supplied.
9. Further keyboard/focus and screen-reader testing, device layout review, unsaved-draft navigation protection, and authenticated end-to-end role journeys.
