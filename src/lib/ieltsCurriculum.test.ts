import { describe, expect, it } from 'vitest';
import { IELTS_UNITS, IELTS_SKILLS, IELTS_OFFICIAL_RESOURCES, isIeltsTrack, unitPrompt } from './ieltsCurriculum';

describe('UniPathway original IELTS curriculum',()=>{
  it('has eight ordered, unique and actionable weeks',()=>{
    expect(IELTS_UNITS).toHaveLength(8);
    expect(IELTS_UNITS.map(u=>u.week)).toEqual([1,2,3,4,5,6,7,8]);
    for(const unit of IELTS_UNITS){
      expect(unit.learningObjectives.length).toBeGreaterThan(1);
      expect(unit.teacherChecklist.length).toBeGreaterThan(1);
      expect(unit.teachingNotes.length).toBeGreaterThan(80);
      expect(unit.minutes).toBeGreaterThan(0);
    }
  });
  it('separates Academic and General Training where required',()=>{
    expect(isIeltsTrack('academic')).toBe(true);
    expect(isIeltsTrack('general')).toBe(true);
    expect(isIeltsTrack('ielts')).toBe(false);
    for(const unit of IELTS_UNITS){
      expect(unitPrompt(unit,'academic').length).toBeGreaterThan(45);
      expect(unitPrompt(unit,'general').length).toBeGreaterThan(45);
    }
    expect(unitPrompt(IELTS_UNITS[3],'academic')).toContain('chart data');
    expect(unitPrompt(IELTS_UNITS[3],'general')).toContain('letter');
    expect(unitPrompt(IELTS_UNITS[2],'academic')).not.toBe(unitPrompt(IELTS_UNITS[2],'general'));
  });
  it('teaches four genuine exam skills without pretending this is an exam',()=>{
    expect(IELTS_SKILLS.map(s=>s.key)).toEqual(['listening','reading','writing','speaking']);
    expect(IELTS_UNITS.some(u=>u.skill==='listening')).toBe(true);
    expect(IELTS_UNITS.some(u=>u.skill==='mock')).toBe(true);
    expect(IELTS_OFFICIAL_RESOURCES.every(x=>x.url.startsWith('https://'))).toBe(true);
  });
});
