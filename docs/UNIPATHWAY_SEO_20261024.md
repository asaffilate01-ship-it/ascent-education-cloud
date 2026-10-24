# UniPathway public SEO — 24 October 2026

Implemented for https://unipathway.pk. Source changes and local checks do not establish that a production publish has completed or that Google has indexed the pages.

- Central title, description and editorial keyword map for 72 public pages: `src/data/public-seo.json`.
- Local search intent: education centre Jhelum, tuition Jhelum, online tuition Pakistan, IELTS preparation, German language courses, UK qualification pathways, technology/accounting training and study destinations. These are editorial targets, not measured keyword-volume or ranking claims. Qualification availability/approval is not invented.
- Homepage copy names Civil Lines, Jhelum and online learning across Pakistan. Organisation structured data uses that location; no unverified postcode, opening hours, reviews or accreditation claims.
- Corrected robots exclusions to exact private roots and their descendants: `/student-support`, `/finance-academy` and `/employer-learning` are no longer accidentally blocked. Robots controls are not access controls.
- Sitemap contains 72 canonical public URLs, including academies, current destinations and five existing articles. It excludes forms/private dashboards and does not invent modification dates.
- Public metadata uses absolute canonical URLs and matching Open Graph/Twitter text. Query strings and legacy `/tenant/unipathway` paths normalize to clean canonical paths. Breadcrumb JSON-LD is replaced on navigation; private/unknown routes receive noindex and clear stale public metadata.
- Replaced the old EduCloud default social card with a 1200×630 UniPathway card. SVG source is retained alongside the PNG.
- Production build emits per-route HTML heads for public routes and noindex heads for known static private routes. React still renders page bodies. This is not full server rendering. Hosting must serve generated route files rather than rewrite every route to the root HTML; verify raw responses after publishing. Dynamic private routes also receive runtime noindex.
- No meta-keywords tag is added: Google ignores it. Keywords belong in useful content, titles, descriptions and internal link context.

Validation: 425 unit/UI tests passed; typecheck and production build passed; generated HTML checked for all 72 public canonical URLs and private portal noindex. Targeted lint passed. Existing application CI also runs before merge. Live domain responded HTTP 200 during inspection, with the prior deployment ID; no Search Console access or submission has been performed.

Next operational checks after publish: inspect root, /ielts-preparation, /finance-academy and /student-support raw HTML; verify sitemap/robots/card URLs; submit the sitemap in the verified Google Search Console property and inspect representative URLs. Request indexing only after live output is verified. Hosting redirects (HTTP/www), full HTML prerendering, Search Console coverage and performance/Core Web Vitals remain separate checks. Do not promise rankings.

References:
- https://developers.google.com/search/docs/crawling-indexing/special-tags
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
