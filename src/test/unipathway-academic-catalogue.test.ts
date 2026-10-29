import { describe, expect, it } from 'vitest';
import { qualificationSelection, officialAwardingBodies } from '@/lib/qualificationSelection';
import { programmePriorities, progressionDestinations } from '@/lib/programmePriorities';
import { isPublicMobilePath } from '@/lib/mobileTabRoutes';

describe('UniPathway academic and careers catalogue', () => {
  it('keeps awarding-body qualifications distinguishable and sourced', () => {
    expect(qualificationSelection.length).toBeGreaterThan(35);
    const bodies = new Set(qualificationSelection.map(q=>q.body));
    expect([...bodies].sort()).toEqual(['OTHM','Pearson BTEC','Qualifi']);
    const unique = new Set(qualificationSelection.map(q=>q.body + q.name));
    expect(unique.size).toBe(qualificationSelection.length);
    for (const qualification of qualificationSelection) {
      expect(qualification.level).toBeGreaterThanOrEqual(3);
      expect(qualification.level).toBeLessThanOrEqual(7);
      expect(qualification.source).toBe(officialAwardingBodies[qualification.body].url);
    }
  });

  it('includes learner progression in Pakistan and five international destinations', () => {
    expect(progressionDestinations).toEqual(['Pakistan','UK','USA','Germany','Canada','Australia']);
    expect(programmePriorities.map(p=>p.to)).toContain('/german-preparation');
    expect(programmePriorities.map(p=>p.to)).toContain('/funded-courses');
    expect(programmePriorities.map(p=>p.to)).toContain('/careers');
  });

  it('keeps every new visitor destination public even while a user is logged in', () => {
    for (const page of ['/qualifications','/funded-courses','/german-preparation','/careers','/student-support']) {
      expect(isPublicMobilePath(page)).toBe(true);
    }
  });
});
