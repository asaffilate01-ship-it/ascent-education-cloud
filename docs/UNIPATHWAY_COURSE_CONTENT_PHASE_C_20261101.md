# UniPathway — course content library, Phase C

## Existing working workflow

- **Lecturer / programme leader / centre leadership:** authenticated `/lecturer/materials` uploads PDF/PPTX/DOCX/XLSX/JPG/PNG/MP4/TXT to private `unipathway-module-materials` storage; draft material metadata lives in `unipathway_module_materials`, with module-specific RLS.
- Lecturers can build structured lessons via `/lecturer/lessons?module=<module_uuid>`.
- Students use `/student/library` for published private resources linked to active programme enrolment.
- Existing `/director/syllabuses` and `/programme/syllabuses` screens reference `unipathway_exam_syllabuses` and related tables **not yet present** in the current UniPathway Lovable-backed database. Do not claim live syllabus approvals.

## New course-content hub

Role-guarded routes: `/director/course-content`, `/programme/course-content`, `/lecturer/course-content`, `/landlord/course-content`.

Groups real centre programme records by awarding-body catalogue identity (OTHM, Qualifi, IAB are the current live `programmes.awarding_body` enum), plus planning categories ATHE, Pearson BTEC/Edexcel, Cambridge International, Pakistan FBISE / BISE Rawalpindi / BISE Lahore / other BISE / AKU-EB, and NAVTTC/NVQF. **Unconfigured** bodies display no phantom programmes, enrolments or qualification approval claims.

The hub shows verified, fully paginated programme/module/material inventory only for a current assigned teaching or management role. Clicking an authorised module opens the preselected private materials upload or structured-lesson editor. It uses no new table, storage bucket, fake data, paid Lovable action or AI model.

## Academic source structure we should collect

For each course and module, curate:

1. Board and **qualification number**, regulation / delivery status verified separately
2. Subject, unit / component code, level, prescribed learning outcomes
3. Syllabus/specification version, academic or exam series and source URL
4. Lecturer-created lesson plan, slides, worked examples, worksheet, mock practice and practical tasks
5. Assessment brief, rubric and independent IQA/moderation records where appropriate
6. Rights-holder, author, copyright/licence basis and permission scope (centre-only, public link, written permission, institution subscription)
7. Draft, reviewed, approved, superseded and withdrawn status with reviewer and expiry

**The existing live module-material table has no board-version/rights audit columns.** The uploader now requires an explicit rights acknowledgment, but that is **not** a permanent legal licence record. A future migration should attach immutable evidence-based source/version metadata and enforce review before publishing third-party files.

## Copyright, accreditation and accurate claims

- Original lecturer-authored material: suitable for private teaching under an approved employment/content policy.
- Licensed publisher material: only where the actual licence permits LMS redistribution; otherwise link to its authorised platform, rather than copy the file.
- Cambridge International: official support/materials and permission conditions are not general authorisation to republish electronic exam papers or mark schemes. Official guidance: https://help.cambridgeinternational.org/hc/en-gb/articles/115004418469-How-do-I-apply-for-permission-to-use-Cambridge-copyrighted-material
- Pearson: specifications, published questions, mark schemes and schemes of work have centre-specific usage/permission conditions. Official guidance: https://support.pearson.com/uk/articles/en_US/Knowledge/Pearson-Copyright-Details
- Pakistan exam boards should be stored individually (FBISE, BISE Rawalpindi, BISE Lahore, other BISE, AKU-EB), not assumed identical. Reference board list: https://ibcc.edu.pk/ibcc-forum-members/
- IBCC equivalence/board registration is not accreditation of UniPathway as an examination centre or equivalence of every qualification; confirm qualification-specific conditions: https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/

## Go-live acceptance

- CI: production bundle, lint, TS, Vitest, database rehearsal, Playwright and Android/iOS compilation.
- Real JWT: student cannot upload or see drafts; lecturer only their assigned module; manager only approved centre; other tenant cannot read or create signed URLs.
- Verify failed uploads and stale authorisation never publish; automatically attempt removal of a newly uploaded private file if its metadata insert fails.
- Mobile: browser widths 360/390/768/1440, accessible filters, data loading/failure/empty states and keyboard navigation.
- External awarding-body approvals and syllabus version mapping remain a **separate activation phase**, not simulated by this app-screen UI.
