# UniPathway — Phase 12: trustworthy lesson resume and offline progress sync

**Prepared:** 17 November 2026. **Scope:** learner-facing lesson ordering, Continue Learning card, and local/offline progress reconciliation.

## Problem and change
- Lesson resume and offline sync previously compared the text of saved `updated_at` values. ISO UTC and `+05:00` timestamps do not sort lexically by absolute time; a newer saved session could therefore be replaced by an older one or direct learners to the wrong lesson.
- The verified Continue Learning snapshot previously accepted calendar-invalid dates, date-only values and timezone-free strings using permissive `Date.parse`.
- Apply the existing strict parser to source-verified `timestamptz` progress records. The Continue Learning card uses absolute milliseconds, with deterministic lesson-ID tie-breaking; malformed timestamps block Resume and show the existing retry/failure state.
- The actual Lesson Workspace's `nextLesson` uses absolute instants, rather than string sorting, and ignores malformed offline timestamps when choosing work. Retain the documented date-only-as-UTC fallback for historical local packs (not for fresh backend Continue Learning receipts).
- Offline progress reconciliation now picks the latest verified absolute time and preserves completion state from either revision-matching entry. Invalid progress times prevent a silent merge/write.

## Validation and boundaries
- Added unit tests for UTC/+05:00 ordering, tie-breaking, historical date-only compatibility, corrupted time records, completed progress and row verification, plus a Continue Learning UI regression for the correct Resume target and error state.
- Do not change enrolment, learner identity, tenant RLS, SQL, qualifications, marks, sync mutation IDs, offline pack lifetime or Microsoft integration.
- Release requires exact PR head passing TypeScript, lint, full unit/DB/Edge/browser CI, Android/iOS and advisory design gates. Source merge is not proof of live production deployment or real-device/centre acceptance.
