import { describe, expect, it } from 'vitest';
import { academyTrackPhase, programmePhase, qualificationPhase, routePhase, techCertifications, tuitionLaunch, tuitionSubjects } from '@/lib/launchPhases';
import { qualificationSelection } from '@/lib/qualificationSelection';
import { techAcademyTracks } from '@/lib/academyCatalog';

describe('Phase 1 launch scope', () => {
  it('opens OTHM and Qualifi Business and Accounting at Levels 3–5 only', () => {
    expect(qualificationPhase({ body: 'OTHM', category: 'Business', level: 4 })).toBe(1);
    expect(qualificationPhase({ body: 'Qualifi', category: 'Accounting & Finance', level: 3 })).toBe(1);
    expect(qualificationPhase({ body: 'Qualifi', category: 'Business', level: 5 })).toBe(1);
  });
  it('keeps Level 6, other subjects and other awarding bodies in Phase 2', () => {
    expect(qualificationPhase({ body: 'OTHM', category: 'Business', level: 6 })).toBe(2);
    expect(qualificationPhase({ body: 'OTHM', category: 'Technology & Cyber Security', level: 4 })).toBe(2);
    expect(qualificationPhase({ body: 'ATHE', category: 'Business', level: 4 })).toBe(2);
    expect(qualificationPhase({ body: 'Pearson BTEC', category: 'Fine Art', level: 4 })).toBe(2);
  });
  it('lists 16 Phase 1 qualifications in the public catalogue', () => {
    expect(qualificationSelection.filter(q => qualificationPhase(q) === 1)).toHaveLength(16);
  });
  it('marks LMS programmes the same way', () => {
    expect(programmePhase({ awarding_body: 'OTHM', title: 'Level 4 Diploma in Business Management', level: 'Level 4' })).toBe(1);
    expect(programmePhase({ awarding_body: 'QUALIFI', title: 'Level 4 Diploma in Computing', level: 'Level 4' })).toBe(2);
    expect(programmePhase({ awarding_body: 'IAB', title: 'Level 3 Diploma in Accounting', level: 'Level 3' })).toBe(2);
  });
  it('opens ACCA preparation and vendor certification preparation first', () => {
    expect(academyTrackPhase('finance', 'acca-prep')).toBe(1);
    expect(academyTrackPhase('finance', 'bookkeeping')).toBe(2);
    expect(academyTrackPhase('tech', 'cert-aws')).toBe(1);
    expect(academyTrackPhase('tech', 'python')).toBe(2);
    expect(techAcademyTracks.filter(t => academyTrackPhase('tech', t.id) === 1).map(t => t.id).sort()).toEqual(['ai', 'cert-aws', 'cert-cisco', 'cert-microsoft', 'generative-ai']);
    expect(academyTrackPhase('tech', 'cert-comptia')).toBe(2);
    expect(techCertifications.map(c => c.vendor)).toEqual(['Microsoft', 'AWS', 'Cisco']);
  });
  it('covers Classes 9–12 sciences, maths, English, technology and commerce', () => {
    expect(tuitionLaunch.subjectGroups.map(g => g.group)).toEqual(['Sciences', 'Mathematics', 'English', 'Technology', 'Commerce']);
    expect(tuitionSubjects).toEqual(expect.arrayContaining(['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Computer Science', 'Accounting', 'Economics']));
  });
  it('covers the Federal Board and every provincial board including AJK', () => {
    expect(tuitionLaunch.pakistanBoards.map(b => b.id)).toEqual(['FBISE', 'Punjab_BISE', 'Sindh_BISE', 'KPK_BISE', 'Balochistan_BISE', 'AJK_BISE']);
    expect(tuitionLaunch.internationalBoards.map(b => b.id)).toEqual(['Cambridge', 'Edexcel']);
  });
  it('labels public pages by phase', () => {
    for (const to of ['/tuition', '/ielts-preparation', '/tech-academy', '/finance-academy', '/qualifications?phase=1']) expect(routePhase(to)).toBe(1);
    for (const to of ['/beauty-aesthetics', '/creative-crafts', '/german-preparation', '/funded-courses']) expect(routePhase(to)).toBe(2);
    expect(routePhase('/careers')).toBeNull();
  });
});
