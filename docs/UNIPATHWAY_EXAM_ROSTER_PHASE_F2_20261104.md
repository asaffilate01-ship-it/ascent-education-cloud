# UniPathway Phase F2 — programme-linked candidate roster and provisional seats
4 November 2026 | `asaffilate01-ship-it/ascent-education-cloud`

## Built and source-wired
- **Centre Director** `/director/exam-rosters`: choose a fully approved internal exam session, bind one active centre programme, review the masked provisional seat register and independently approve a submitted revision.
- **Exams Officer** `/exams/candidate-seating`: enter a verified institutional student UUID from the admissions desk; the server checks that learner's current centre and **active enrolment in the linked programme**. Save, change or remove a provisional seat, then submit the exact approved candidate-count roster for a different Centre Director to review.
- F1 approved plan must still match its real academic calendar event and must remain internally approved; changes in date, room or session capacity fail closed. F2 has its own backend read and write gates, both **OFF by default**, in addition to F1's gates.
- One event-only, allowlisted SQL JSON projection returns **masked learner references**, seat codes, programme ID, status, revision and capacity. It **does not disclose full student IDs, names, contact details, passport/medical/consent records, identity documents, official results or staff identities**.
- Concurrent assignments lock the approved F1 session, prevent duplicate seats, over-capacity rosters and stale revisions. Every mutation has a per-centre/per-actor/per-request idempotent receipt, private audit trail and an independent director approval stage.
- Responsive desktop/mobile navigation and safe, source-tested React forms, with failed writes requiring the operator to reconcile the register before a fresh action.

## Crucial distinctions
An internal seat is **provisional**, not confirmation of a real awarding-body exam entry. The staff checkbox records review of a participation/consent **procedure**, not a signed student-consent record or physical ID verification. It does not certify reasonable adjustments, room layout, academic eligibility for a regulated examination, invigilator appointment, exam entry, final result or certificate.

The first F2 source stage deliberately requires an institutional learner UUID already verified through the authorised enrolment workflow. It does **not** provide a free-text PII search or expose every student in the centre; a properly scoped lookup, actual candidate consent and explicit awarding-body enrolment proof are later phases.

## Activation: do not perform until verified
1. Confirm the correct UniPathway Supabase project and migrations, backups, schema and RLS; the currently connected account exposes **DISHBEE only**. Never deploy these patches there or replay historical migrations.
2. Review and apply **Phase F1** `scripts/activation/unipathway-exam-operations-forward.sql` to verified UniPathway staging first. Then review F2 `scripts/activation/unipathway-exam-roster-forward.sql`. **Do not** enable either Phase's backend flags by simply merging GitHub source.
3. Run `node scripts/test-unipathway-exam-roster-db.mjs` in isolated PGlite. Use **real authenticated JWTs across at least two UniPathway centres** to test direct PostgREST, default-deny table grants, private RPC behavior, cross-tenant negative cases, role revocation, suspended centres, double-booked seats, active enrolment withdrawal, exact count and idempotency.
4. Verify schema source types, actual signed participation/consent and data retention policy; agree with QA/Exams Officers on confidential individual seat-slip delivery and the verified invigilator appointment process.
5. Independently enable F1 reads/writes and F2 reads, with source flags `VITE_UNIPATHWAY_EXAM_ROSTER_ENABLED=true`. **Only after security acceptance**, enable F2 backend writes and `VITE_UNIPATHWAY_EXAM_ROSTER_WRITES_ENABLED=true`. Audit every activation and rollback.
6. Never export provisional seat lists to public websites or send confidential data to marketing, agents, external universities, parents or unauthorised colleagues.

## Subsequent phases
- Exact programme/specification-level board eligibility and **official** examination registration receipts.
- Confirmed student consent or an independently assessed processing basis, approved individual adjustments and identity check evidence.
- Secure personalised seating slips, invigilator appointment and attendance, malpractice/safeguarding incident workflow, result imports and certificates with provenance.
- Final school-operations acceptance across online/in-centre teaching, 24-hour recordings, technical/language labs, wellbeing, roles and permissions.
