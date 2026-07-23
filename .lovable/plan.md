
# UniPathway: Germany + Expanded UK Pathways

Scoped to the **UniPathway tenant only** (`/tenant/unipathway/*`). EduCloud landlord site is not touched. Source of truth = uploaded LoungeTech/EduCloud blueprint + DAAD Pakistan, Make it in Germany, BEOE, SECP and GOV.UK Student Visa conventions.

## 1. New public pages (marketing + information)

All rendered inside the existing `TenantNav` + tenant theme. UK English, compliance-safe copy, no "guaranteed", no unlicensed claims.

```text
/tenant/unipathway/germany            Germany hub (bachelor's, master's, PhD, Studienkolleg)
/tenant/unipathway/germany/language   German A1–B2 + TestDaF/telc/Goethe prep
/tenant/unipathway/germany/costs      Tuition, semester fee, blocked account (Sperrkonto), living costs
/tenant/unipathway/germany/visa       Student visa, health insurance, post-study 18-month job-seeker route
/tenant/unipathway/uk                 UK hub (foundation, bachelor's, master's, PhD, top-up)
/tenant/unipathway/uk/language        Academic English + IELTS / PTE / TOEFL preparation
/tenant/unipathway/uk/costs           Tuition ranges, maintenance funds, CAS deposit
/tenant/unipathway/uk/visa            Student route + Graduate route (2-yr, moving to 18-mo from 2027)
/tenant/unipathway/pathways           Comparison table: Pakistan-in-country vs UK vs Germany
/tenant/unipathway/apply/:destination New applicant intake (destination = germany | uk)
```

Each destination hub contains: eligibility for Pakistani/Indian/overseas HSSC/A-Level/Bachelor holders, qualification equivalency (HEC ↔ Anabin/uni-assist ↔ UK NARIC/ENIC), tuition & blocked-fund figures, document checklist, post-study work route, and a **compliance disclosure block** naming the legal operator, awarding body, and current approval status (per blueprint §1.1).

`TenantNav` gets a "Study Abroad" dropdown linking Germany, UK, Language Academy, Pathways.

## 2. Language Academy section

New `LanguageAcademy` component reused on both `/germany/language` and `/uk/language`:

- German track: A1, A2, B1, B2 (live online / classroom, no recordings) + separate TestDaF / telc / Goethe **preparation** courses (never sold as certification).
- English track: Academic English + IELTS / PTE / TOEFL preparation.
- Each course card shows: level, hours, delivery mode, fee (Rs.), and an "Exam preparation only — official certificate issued by the awarding exam body" notice.

## 3. Applicant workflow (uses existing tables)

Reuse `applications` and `student_enrolments`. No schema-breaking changes; add non-destructive columns via one migration:

- `applications.destination` text (`pakistan` | `germany` | `uk`), default `pakistan`
- `applications.study_level` text (`foundation` | `bachelors` | `masters` | `phd` | `language`)
- `applications.intake` text (e.g. `winter_2026`, `summer_2027`)
- `applications.document_checklist` jsonb (array of `{ key, label, status, required }`)

Stages already exist (`lead → contacted → qualified → applied → under_review → conditional_offer → unconditional_offer → deposit_paid → enrolled | lost`). The new **Apply** page (`/tenant/unipathway/apply/:destination`) is a 5-step wizard:

1. Personal + contact (Pakistani/overseas)
2. Academic history + qualification equivalency self-check
3. Language proficiency (IELTS/TestDaF etc., or "enrol me in prep course")
4. Destination-specific: Germany → uni-assist awareness, blocked-fund acknowledgement; UK → CAS + maintenance-fund acknowledgement
5. Document checklist upload (passport, transcripts, English/German cert, financial proof)

On submit → inserts into `applications` with `destination`, `stage='applied'`, seeded checklist. Existing Admissions CRM Kanban already handles the rest.

## 4. Staff-facing changes (light)

- `AdmissionsCRM` gets a **destination filter** (Pakistan / Germany / UK) — filters existing Kanban, no logic change.
- Applicant card shows a small destination flag chip.
- Full roles / maker-checker / permission-matrix redesign from the blueprint is **out of scope for this pass** — flagged as phase 2. Existing `has_role` + RLS already covers admissions_admin, centre_director, student.

## 5. Compliance guardrails (copy + UI)

A shared `ComplianceDisclosure` component rendered on every Germany/UK page:

> UniPathway is an education-counselling and language-preparation service. Admission decisions are made by the receiving institution; visa decisions are made by the competent authority. We do not guarantee admission, scholarship, CAS or visa. Official language certificates are issued only by the authorised exam body.

Marketing copy rules enforced in code review, not runtime: no "approved course" wording unless a partner + current agreement is named on the same card; the word "official" is reserved for exam bodies.

## 6. Content sources & regional detail

- Germany: DAAD Pakistan equivalency, Anabin/uni-assist workflow, current Sperrkonto amount displayed as a variable ("approx. €11,904 / year — verify current figure at time of application"), 18-month post-study job-seeker visa.
- UK: British Council AQF for agents, GOV.UK Student Visa maintenance figures, Graduate Route current 2 years (planned reduction to 18 months from 2027 — already worded this way elsewhere in the app).
- Pakistan applicants: BEOE boundary — no overseas job placement offered; SECP — Pakistan operator named in every local invoice/contract (footer disclosure).

## 7. Out of scope (call out to user)

Not in this pass, can be a follow-up:

- Full roles/permission matrix + maker-checker workflow from blueprint §10
- Dedicated staff dashboards per blueprint §11
- New DB entities for uni-assist tracking, blocked-fund ledger, exam-centre partnerships
- 90-day roadmap page and internal audit-pack generator
- Marketing rules engine (auto-expire approval claims)

## Technical notes

- All new pages under `src/pages/tenant/germany/` and `src/pages/tenant/uk/`, plus `src/pages/tenant/apply/`.
- New shared components: `ComplianceDisclosure`, `LanguageAcademy`, `PathwayComparisonTable`, `ApplicationWizard`.
- One additive migration for the four `applications` columns above (nullable, safe for existing rows).
- Routes added in `src/App.tsx` behind the existing tenant route tree; gated to `slug === 'unipathway'` at page level so other tenants are unaffected until we generalise.
- Uses existing design tokens, `TenantNav`, `useTenantBranding`. No new colours or fonts.
