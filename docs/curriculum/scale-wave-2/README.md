# UniPathway curriculum expansion, wave 2

**58 draft teaching items for staff review.** These are original formative lessons, exercises and labs. Suggested route placements are not syllabus approvals, and the files are not published to learners.

| Pack | Items | Focus |
| --- | ---: | --- |
| [School and Cambridge](school.md) | 12 | Three proposed items each for Punjab, Sindh, Federal and Cambridge review lanes. |
| [ACCA preparation](acca.md) | 12 | Foundations through Strategic Professional, supplementing the broader coverage in wave 1. |
| [Vocational Levels 2–6](vocational.md) | 12 | Three each in business management, accounting, health and social care, and technology. |
| [IELTS and languages](languages.md) | 12 | Academic and General Training writing, Life Skills A1 and B1 speaking/listening, and German, French, Italian and Spanish. |
| [Practical technology](labs.md) | 10 | Five school labs and five vocational labs with offline or local tools. |

## Staff workflow

Use the [review index](review-index.csv) to find the source of an item and the [review and release checklist](review-and-release.md) to prepare a small, cohort-specific pilot. For the wider authoring target, see the [wave 1 coverage register](../scale-wave-1/coverage-register.md). Count the same teaching objective and evidence once when mapped to several routes. The 3,200-item envelope is not a published total.

From the repository root, run:

```sh
python3 docs/curriculum/scale-wave-2/build-review-index.py --check
```

Use `--write` instead to regenerate the CSV from the five teaching files. The check verifies the expected count and sequential IDs, refuses empty sections and detects edits to the generated CSV. It does not validate teaching quality, equivalence, reviewer decisions or live access. Neither command connects to the LMS.
