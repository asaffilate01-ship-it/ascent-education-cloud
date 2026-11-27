import { describe, expect, it } from 'vitest';
import { academyTrackPhase, programmePhase, qualificationPhase, plannedLater2027Qualification, phaseOneOffers, centrePathwayPhase, priorityPhase, routePhase, techCertifications, tuitionLaunch, tuitionSubjects } from '@/lib/launchPhases';
import { qualificationSelection } from '@/lib/qualificationSelection';
import { techAcademyTracks } from '@/lib/academyCatalog';

describe('Phase 1 launch scope', () => {
  it('reserves January for preparation rather than regulated diplomas', () => {
    expect(phaseOneOffers.map(o=>o.id)).toEqual(['tuition','acca','ielts','tech-certs']);
    expect(qualificationSelection.filter(q=>qualificationPhase(q)===1)).toHaveLength(0);
    expect(centrePathwayPhase('othm-diplomas')).toBe(2);
    expect(centrePathwayPhase('software-data')).toBe(1);
    expect(priorityPhase('qualifi')).toBe(2);
  });
  it('identifies priority later-2027 technology, business and accounting titles without claiming availability',()=>{
    for(const category of ['Business','Accounting & Finance','Technology & Cyber Security']){
      for(const level of [3,4,5]){
        expect(plannedLater2027Qualification({body:'OTHM',category,level})).toBe(true);
        expect(plannedLater2027Qualification({body:'Qualifi',category,level})).toBe(true);
        expect(qualificationPhase({body:'OTHM',category,level})).toBe(2);
      }
    }
    expect(plannedLater2027Qualification({body:'OTHM',category:'Business',level:6})).toBe(false);
    expect(plannedLater2027Qualification({body:'ATHE',category:'Business',level:4})).toBe(false);
    expect(plannedLater2027Qualification({body:'OTHM',category:'Health & Education',level:4})).toBe(false);
  });
  it('keeps diploma catalogue phase fallbacks separate from actual LMS enrolments',()=>{
    expect(programmePhase({awarding_body:'OTHM',title:'Level 4 Diploma in Business Management',level:'Level 4'})).toBe(2);
    expect(programmePhase({awarding_body:'QUALIFI',title:'Level 4 Diploma in Computing',level:'Level 4'})).toBe(2);
  });
  it('opens ACCA preparation and vendor certification preparation first', () => {
    expect(academyTrackPhase('finance', 'acca-prep')).toBe(1);
    expect(academyTrackPhase('finance', 'bookkeeping')).toBe(2);
    expect(academyTrackPhase('tech', 'cert-aws')).toBe(1);
    expect(academyTrackPhase('tech', 'python')).toBe(1);
    expect(techAcademyTracks.filter(t => academyTrackPhase('tech', t.id) === 1).map(t => t.id).sort()).toEqual(['ai', 'analytics', 'cert-aws', 'cert-cisco', 'cert-microsoft', 'cloud', 'generative-ai', 'python', 'web']);
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
    for (const to of ['/tuition', '/ielts-preparation', '/tech-academy', '/finance-academy']) expect(routePhase(to)).toBe(1);
    for (const to of ['/qualifications?phase=2','/beauty-aesthetics', '/creative-crafts', '/german-preparation', '/funded-courses']) expect(routePhase(to)).toBe(2);
    expect(routePhase('/careers')).toBeNull();
  });
});
