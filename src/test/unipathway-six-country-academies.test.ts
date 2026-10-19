import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {academyTracks,techAcademyTracks,financeAcademyTracks} from '@/lib/academyCatalog';
import {studyDestinations} from '@/lib/studyDestinations';
import {vocationalTracks,vocationalSectors} from '@/lib/vocationalTracks';
import {isPublicMobilePath,isMobileTabActive} from '@/lib/mobileTabRoutes';

describe('UniPathway academy, international progression and employment completeness',()=>{
 it('separates technology, accountancy and professional exam-preparation tracks',()=>{
   expect(academyTracks('tech')).toBe(techAcademyTracks);
   expect(academyTracks('finance')).toBe(financeAcademyTracks);
   expect(techAcademyTracks.length).toBeGreaterThanOrEqual(10);
   expect(financeAcademyTracks.length).toBeGreaterThanOrEqual(10);
   const ids=[...techAcademyTracks,...financeAcademyTracks].map(x=>x.id);
   expect(new Set(ids).size).toEqual(ids.length);
   expect(techAcademyTracks.some(x=>x.title.includes('Cyber Essentials'))).toBe(true);
   expect(techAcademyTracks.some(x=>x.title.includes('Generative AI'))).toBe(true);
   expect(financeAcademyTracks.some(x=>x.title.includes('ACCA'))).toBe(true);
   expect(financeAcademyTracks.some(x=>x.title.includes('IFA'))).toBe(true);
   for(const x of [...techAcademyTracks,...financeAcademyTracks]){
     expect(x.topics.length).toBeGreaterThanOrEqual(4);
     expect(x.practical.length).toBeGreaterThan(25);
     expect(x.certification.length).toBeGreaterThan(18);
   }
 });
 it('offers all six study destinations with university, language and official source guidance',()=>{
   expect(Object.keys(studyDestinations).sort()).toEqual(['australia','canada','germany','pakistan','uk','usa']);
   for(const key of Object.keys(studyDestinations)){
     const d=studyDestinations[key as keyof typeof studyDestinations];
     expect(d.routes.length).toBeGreaterThanOrEqual(4);
     expect(d.languages.length).toBeGreaterThanOrEqual(1);
     expect(d.documentChecklist.length).toBeGreaterThanOrEqual(5);
     expect(d.practical.length).toBeGreaterThanOrEqual(3);
     expect(d.universityExamples.length).toBeGreaterThanOrEqual(3);
     expect(d.official.length).toBeGreaterThanOrEqual(3);
     expect(d.official.every(x=>x.url.startsWith('https://'))).toBe(true);
     expect(isPublicMobilePath('/'+key)).toBe(true);
   }
   expect(studyDestinations.canada.languages.some(x=>x.title.toLowerCase().includes('french'))).toBe(true);
   expect(studyDestinations.germany.languages.some(x=>x.title.toLowerCase().includes('german'))).toBe(true);
   expect(isMobileTabActive('/pathways','/usa')).toBe(true);
   expect(isMobileTabActive('/pathways','/pakistan')).toBe(false);
   expect(isMobileTabActive('/study','/pakistan')).toBe(true);
 });
 it('shows genuine careers/vocational learning topics without implying funding is awarded',()=>{
   expect(vocationalTracks.length).toBeGreaterThanOrEqual(20);
   expect(vocationalSectors).toContain('Beauty & Fashion');
   expect(vocationalSectors).toContain('Trades & Energy');
   for(const x of vocationalTracks){
     expect(x.topics.length).toBeGreaterThanOrEqual(4);
     expect(x.outcome.length).toBeGreaterThan(15);
     expect(x.nextStep.length).toBeGreaterThan(15);
   }
 });
 it('keeps current public and protected routes linked, and About free from invented metrics',()=>{
   const a=readFileSync('src/App.tsx','utf8');
   for(const path of ['/tech-academy','/finance-academy','/pakistan','/usa','/canada','/australia','/director/employers','/admissions/employers','/landlord/employers','/student/opportunities']){
     expect(a).toContain('path="'+path+'"');
   }
   const about=readFileSync('src/pages/tenant/TenantAboutPage.tsx','utf8');
   expect(about).not.toContain('342+');
   expect(about).not.toContain('95%');
   expect(about).not.toContain('50–70%');
   expect(about).toContain('#0B2D5B');
   expect(about).toContain('#16A34A');
 });
});
