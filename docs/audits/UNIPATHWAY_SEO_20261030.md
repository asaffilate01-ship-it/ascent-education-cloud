# UniPathway SEO audit — 30 October 2026

Scope: https://unipathway.pk and GitHub source at `73bd99355e780f97baeae53e745f942104f38427`. This is a technical baseline, not a ranking or traffic assessment.

## Skills discovered and applied

Used Vercel's [find-skills](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md), the skills.sh leaderboard and `npx --yes skills find seo audit`. Selected established, directly relevant sources rather than installing every search result:

- [Corey Haines SEO Audit](https://github.com/coreyhaines31/marketingskills/blob/main/skills/seo-audit/SKILL.md): crawlability, metadata, evidence and priorities.
- [Addy Osmani SEO](https://github.com/addyosmani/web-quality-skills/blob/main/skills/seo/SKILL.md) and [Core Web Vitals](https://github.com/addyosmani/web-quality-skills/blob/main/skills/core-web-vitals/SKILL.md): separate HTTP, rendered DOM and measured performance findings.
- [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md): semantic headings, image alternatives and responsive interface checks.

Read and applied as audit guidance; no permanent skill installation or paid service was required.

## Verified passes

The adjacent JSON evidence records an unauthenticated live crawl of all 73 catalogue URLs. All returned HTTP 200, matched catalogue titles and descriptions, and had the expected single canonical and Open Graph URL. No duplicate titles or descriptions were found. The sitemap contains exactly those 73 URLs. Public pages had no detected noindex directives. Raw JSON-LD parsed successfully.

HTTP and www homepage variants ended at the HTTPS apex URL. The tuition trailing-slash variant declares the canonical without the slash. Login returns noindex and has no canonical; this is expected, not an error.

The live rendered homepage has one H1, EducationalOrganization and BreadcrumbList JSON-LD, one canonical and no images missing an alt attribute. Empty alt values are permitted for decorative images. This homepage check is not an accessibility audit of every route.

## Findings and next phases

| Priority | Finding and evidence | Action and acceptance criteria |
| --- | --- | --- |
| P1 | Unknown URL `/seo-audit-not-a-real-page-20261030` returns HTTP 200 with indexable homepage metadata and homepage canonical. Existing RouteIndexing applies noindex after JavaScript, but does not change the HTTP response. | Configure hosting to return HTTP 404 for unknown public routes while preserving valid React routes and private deep links. Verify with raw requests and browser navigation after deployment. Do not blindly replace the SPA fallback or break sign-in links. This remains unresolved. |
| P2 | All sampled raw page bodies contain the JavaScript application shell; route-specific heads are generated, but body headings and links require rendering. Source: `scripts/build-public-seo.mjs`. The rendered homepage works. | Evaluate prerendering or SSR for public catalogue and editorial routes, with parity tests for visible content, links and metadata. Keep authenticated dashboards outside the public render scope. This is a resilience opportunity, not proof that Google cannot index the site. |
| P2 | Core Web Vitals have not been measured in this audit. The PageSpeed Insights API returned HTTP 429. | Obtain mobile and desktop lab reports and available CrUX field data. Measure LCP, INP and CLS before prioritising performance changes. Request duration in the JSON is not a Core Web Vital. |
| P2 | Search Console ownership, sitemap submission, URL inspection, impressions and queries are unavailable to this session. An empty web-search result does not establish absence from Google's index. | Verify the domain in Search Console, submit `/sitemap.xml`, inspect representative course/blog URLs and review indexing exclusions. Do not claim ranking gains or complete indexing without that evidence. |

## Reproduction and limitations

Run from the repository root:

```sh
python scripts/audit-public-seo.py --output docs/audits/unipathway-seo-http.json
```

The script uses the Python standard library and performs read-only public HTTP requests. It follows redirects and records final URLs, not every intermediate redirect status. It compares raw HTTP metadata with the source catalogue. It does not execute JavaScript, audit course accreditation claims, inspect authenticated dashboards, measure Core Web Vitals, validate rich-result eligibility or assess backlinks.

The JSON is a dated snapshot; its raw H1 and link counts must not be described as rendered-content failures. No production source or hosting configuration changed in this audit.
