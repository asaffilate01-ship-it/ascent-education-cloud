# Homepage hero and education-site UX review — 30 October 2026

## Implemented

- A 13-second, 1280×720 H.264 loop built from three existing approved UniPathway still images: the original separated student groups, the technology classroom and the women-only sewing classroom. Slow camera movement and crossfades are edited locally using FFmpeg; no paid tools, new AI generation, third-party footage or API calls.
- 906,056-byte MP4 with no audio stream and fast-start metadata. Rebuild with `node scripts/build-home-hero.mjs` using FFmpeg with libx264. Encoding is a development task, not a deployment dependency.
- The existing responsive 640/1200px homepage illustration remains the initial high-priority image. Video is optional, decorative and excluded from PWA precaching. The source is not attached for reduced motion, Save-Data, 2G connections or hidden documents. Playback failure leaves the image and navigation available. Visitors can pause and resume motion.
- Keep the education-first headline, search, subject filters and admissions steps. Add a prominent application choice and shortcuts to study options, Foundation funding, overseas support and the student portal. Add pre-application guidance on progression, funding eligibility and adviser support.
- The exact managed development-preview hostname is allowlisted in Vite; the host check remains enabled.

## References and what was adapted

| Source reviewed | Useful pattern | UniPathway implementation |
|---|---|---|
| https://www.pengroup.com/ | Immersive video backdrop, readable overlay, clear primary choices | Original branded animated hero; no PEN media or copy reused |
| https://www.lpc.ac.uk/ | Distinct application/course choices, visible learner-support and funding routes | Course finder and application actions; quick funding/support navigation |
| https://www.zahs.co.uk/ | Prominent programme choices and explanations of flexible learning/support | Retained clear online/in-centre delivery information and adviser route |
| https://innovainstitute.ae/ | Goal-oriented discovery, short/long programme categories and a visible admissions journey | Retained subject filtering and the existing three-step journey; added practical pre-application choices |
| https://www.esl.ac.uk/ | Full visual hero, prominent student access and service links | Readable hero and a direct student portal shortcut |

These are interface references, not partnerships or endorsements. Do not copy another provider's statistics, scholarships, accreditation claims, university logos or testimonials. Foundation assistance remains conditional on criteria and available funds. Imagery is labelled illustrative and does not depict actual UniPathway premises, staff or learners.

## Verification

The actual hero component was viewed in the managed browser and the real 13-second silent video played; the pause control changed to Play. Screenshot: `docs/screenshots/unipathway-hero-20261030.jpg` (component review, not a live-site publication screenshot).

The full local app preview hit its existing online-import/offline-reader recovery path, so the visual review used an isolated component harness without backend setup; temporary harness files were removed. Full-app navigation, mobile/large-text overflow, playback and no-video reduced-motion/data-saving checks are covered by the added Chromium acceptance tests. Unit tests cover motion preferences, restricted connections, pause/resume and playback failure. Production build/type checks and CI establish their separate results; browser component review does not prove live publication.

The hero has no production subscription or generation charges. Serving the video consumes the site's normal bandwidth; this work does not guarantee unlimited free hosting or change a hosting plan.
