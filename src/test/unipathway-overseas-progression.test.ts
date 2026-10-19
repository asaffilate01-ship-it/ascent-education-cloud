import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getProgressionInstitutions, progressionRecords, progressionCountries } from '@/lib/universityProgressionDirectory';
import { isMobileTabActive, isPublicMobilePath } from '@/lib/mobileTabRoutes';
import { programmePriorities } from '@/lib/programmePriorities';

describe('UniPathway domestic Pakistan and verified overseas progression navigation', () => {
 it('keeps Pakistan in the Study menu but out of Study Abroad', () => {
   const nav=readFileSync('src/components/PublicNav.tsx','utf8');
   const study=nav.slice(nav.indexOf('export const studyLinks'),nav.indexOf('export const destinationLinks'));
   const overseas=nav.slice(nav.indexOf('export const destinationLinks'),nav.indexOf('const linkCls'));
   expect(study).toContain("label: 'Study in Pakistan'");
   expect(overseas).not.toContain("label: 'Pakistan'");
   expect(overseas).toContain("label: 'United Kingdom'");
   expect(isMobileTabActive('/pathways','/pakistan')).toBe(false);
   expect(isMobileTabActive('/study','/pakistan')).toBe(true);
 });
 it('preserves destination and university query parameters when redirecting to the tenant', () => {
   const app=readFileSync('src/App.tsx','utf8');
   expect(app).toContain('const { search, hash } = useLocation()');
   expect(app).toContain('${suffix}${search}${hash}');
   expect(app).toContain('path="/university-progression"');
   expect(isPublicMobilePath('/university-progression')).toBe(true);
 });
 it('contains named OTHM and Qualifi institutions with no invented Canadian partner entries', () => {
   expect(progressionCountries).toEqual(['UK','USA','Australia','Canada']);
   expect(progressionRecords.length).toBeGreaterThanOrEqual(60);
   expect(progressionRecords.every(r=>r.sourceKey.startsWith(r.body.toLowerCase()))).toBe(true);
   expect(progressionRecords.filter(r=>r.country==='Canada')).toHaveLength(0);
   expect(progressionRecords.filter(r=>r.country==='USA'&&r.body==='Qualifi').length).toBeGreaterThanOrEqual(8);
   expect(progressionRecords.filter(r=>r.country==='Australia').length).toBeGreaterThanOrEqual(3);
   expect(progressionRecords.some(r=>r.institution.includes('Ottawa University')&&r.country==='USA')).toBe(true);
   expect(progressionRecords.some(r=>r.institution.includes('Curtin University')&&r.country==='Australia')).toBe(true);
   const bodySet=new Set(progressionRecords.map(r=>r.body));
   expect([...bodySet].sort()).toEqual(['OTHM','Qualifi']);
 });
 it('merges university records while retaining each awarding-body route',()=>{
   const list=getProgressionInstitutions();
   expect(list.length).toBeLessThan(progressionRecords.length);
   const arden=list.find(x=>x.name==='Arden University');
   expect(arden?.records.map(x=>x.body).sort()).toEqual(['OTHM','Qualifi']);
   expect(arden?.records.every(x=>x.route.trim().length>25)).toBe(true);
 });
 it('ensures every Study "Explore options" destination resolves to an app route',()=>{
   const app=readFileSync('src/App.tsx','utf8');
   const routes=new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(x=>x[1]));
   const missing=programmePriorities.filter(p=>!routes.has(p.to.split('?')[0].split('#')[0]));
   expect(missing).toEqual([]);
 });
});
