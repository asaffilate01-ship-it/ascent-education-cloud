import {describe,it,expect} from 'vitest';
import {academyAccreditationSchemes,accreditationStages,cibtacQualifications,cpdCandidateCourses,mayAdvertiseAward} from '@/lib/beautyAccreditation';
import {curriculumSamples,sampleHasSufficientUnitReferences} from '@/lib/curriculumSamples';
import {isPublicMobilePath} from '@/lib/mobileTabRoutes';
import {readFileSync} from 'node:fs';

describe('UniPathway Beauty & Aesthetics approval and curriculum contracts',()=>{
 it('lists published CIBTAC qualification codes with verifiable awarding-body references',()=>{
   expect(cibtacQualifications.length).toBeGreaterThan(12);
   expect(new Set(cibtacQualifications.map(c=>c.code)).size).toBe(cibtacQualifications.length);
   expect(new Set(cibtacQualifications.map(c=>c.qan)).size).toBe(cibtacQualifications.length);
   for(const course of cibtacQualifications){
     expect(course.name).toMatch(/^CIBTAC/i);
     expect(course.source).toContain('cibtac.com/');
     expect(course.qan).toMatch(/^\d{3}\/\d{4}\/[0-9X]$/);
     expect([2,3,4]).toContain(course.level);
   }
 });
 it('keeps short CPD candidates separate from already approved CIBTAC awards',()=>{
   expect(cpdCandidateCourses.length).toBeGreaterThan(5);
   expect(cpdCandidateCourses.every(c=>!('qan' in c))).toBe(true);
   expect(academyAccreditationSchemes.map(s=>s.id)).toEqual(['cibtac_centre','cpduk_provider','cibtac_endorsed']);
 });
 it('does not advertise accreditation from submissions, missing evidence or expired claims',()=>{
   const day=new Date('2026-10-18T12:00:00Z');
   for(const status of accreditationStages.filter(x=>x!=='approved')){
      expect(mayAdvertiseAward(status,true,'2027-01-01',day)).toBe(false);
   }
   expect(mayAdvertiseAward('approved',false,'2027-01-01',day)).toBe(false);
   expect(mayAdvertiseAward('approved',true,'2026-01-01',day)).toBe(false);
   expect(mayAdvertiseAward('approved',true,'2027-01-01',day)).toBe(true);
 });
 it('includes only verified reference numbers when importing a complete official unit sample',()=>{
   const qualifi=curriculumSamples.find(s=>s.id==='qualifi-l4-ai')!;
   expect(qualifi.qualificationCode).toBe('610/3934/2');
   expect(qualifi.units.map(u=>u.credits).reduce((a,b)=>a+b,0)).toBe(120);
   expect(sampleHasSufficientUnitReferences(qualifi)).toBe(true);
   const othm=curriculumSamples.find(s=>s.id==='othm-l4-business')!;
   expect(othm.qualificationCode).toBe(null);
   expect(sampleHasSufficientUnitReferences(othm)).toBe(false);
 });
 it('uses public visitor routes and role-guarded management routes',()=>{
   expect(isPublicMobilePath('/beauty-aesthetics')).toBe(true);
   const app=readFileSync('src/App.tsx','utf8');
   expect(app).toContain('path="/beauty-aesthetics" element={<BeautyAcademy />}');
   expect(app).toContain('path="/director/beauty-accreditation" element={<Director><BeautyAccreditationDashboard /></Director>}');
   expect(app).toContain('path="/landlord/beauty-accreditation" element={<Landlord><BeautyAccreditationDashboard /></Landlord>}');
 });
});
