import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findInternationalStudyGuide, internationalStudyGuides } from '@/lib/internationalStudy';
import { isMobileTabActive, isPublicMobilePath } from '@/lib/mobileTabRoutes';
import { isIndexablePath, publicSeo } from '@/lib/publicSeo';

describe('public international study directory', () => {
  it('has distinct, indexable guides and separate academic routes for all covered destinations', () => {
    expect(internationalStudyGuides.map(guide => guide.slug)).toEqual(['uk', 'italy', 'germany', 'australia', 'canada', 'usa', 'france', 'spain', 'netherlands']);
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(isIndexablePath('/international-study')).toBe(true);
    for (const guide of internationalStudyGuides) {
      const path = `/international-study/${guide.slug}`;
      expect(isIndexablePath(path)).toBe(true);
      expect(publicSeo[path].title).toContain(guide.country);
      expect(sitemap).toContain(`<loc>https://unipathway.pk${path}</loc>`);
      expect(findInternationalStudyGuide(guide.slug)).toBe(guide);
      expect(isPublicMobilePath(path)).toBe(true);
      expect(isMobileTabActive('/international-study', path)).toBe(true);
      expect(isIndexablePath(guide.academicLink)).toBe(true);
      expect(guide.sources.every(source => new URL(source.url).protocol === 'https:')).toBe(true);
    }
  });
  it('does not treat unknown guides as indexable or place Pakistan in the overseas tab', () => {
    expect(findInternationalStudyGuide('missing')).toBeUndefined();
    expect(isIndexablePath('/international-study/missing')).toBe(false);
    expect(isMobileTabActive('/international-study', '/pakistan')).toBe(false);
  });
});
