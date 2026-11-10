# Student application tracking — source phase (10 November 2026)

**Source-only, no hosted database or approval changes.** `/student/applications` is a read-only student-owned record history, with active Student role, linked `user_id`, current `tenant_id`, a narrow column projection and independently enforced Supabase RLS. It is reachable from Today support links and the Student sidebar without exposing staff application management.

The existing public Pakistan course enquiry still inserts an anonymous contact lead without an authenticated learner binding; such enquiries do **not** appear automatically in this page. An email/name match is *not* a safe ownership proof. Admissions should separately verify the student's account and link any prior application through an approved workflow rather than guess ownership.

Pipeline stage labels are deliberately non-authoritative: a recorded conditional or unconditional offer does not prove that an offer document was issued or accepted; a `deposit_paid` stage does not prove a settled payment; an `enrolled` stage is not a substitute for an independently confirmed active academic enrolment. The learner can view My Courses to verify active access. No inline approval, payment, admission, qualification or grade decision is created here.

Follow-up release gates: confirm authenticated two-centre RLS against read-only application metadata (including another student in the same centre), reconcile public enquiry identity handover, create formal offer signing and payment receipt verification, verify actual role/centre transitions and complete Android/desktop accessibility acceptance.
