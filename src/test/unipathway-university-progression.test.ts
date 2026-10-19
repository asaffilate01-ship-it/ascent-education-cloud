import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {programmePriorities} from '@/lib/programmePriorities';
import {
  canadaProgressionStatus,filterProgressionUniversities,progressionCountries,
  universityProgressionDirectory,PROGRESSION_SOURCE
} from '@/lib/universityProgressionDirectory';
import {destinationLinks,studyLinks} from '@/components/PublicNav';
import {isMobileTabActive,isPublicMobilePath} from '@/lib/mobileTabRoutes';

describe('UniPathway named university progressions and study navigation',()=>{
 it('all Explore options links have a declared application route',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  const routes=new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(x=>x[1]));
  for(const p of programmePriorities){
   expect(routes.has(p.to.split(/[?#]/)[0]),`Unknown route for ${p.title}: ${p.to}`).toBe(true);
  }
 });
 it('separates domestic Pakistan study from Study Abroad on desktop and mobile',()=>{
  expect(studyLinks.find(l=>l.to==='/pakistan')?.label).toBe('Study in Pakistan');
  expect(destinationLinks.some(l=>l.to==='/pakistan')).toBe(false);
  expect(destinationLinks.some(l=>l.to==='/canada')).toBe(true);
  expect(isPublicMobilePath('/pakistan')).toBe(true);
  expect(isMobileTabActive('/pathways','/pakistan')).toBe(false);
  expect(isMobileTabActive('/pathways','/usa')).toBe(true);
  const abroad=readFileSync('src/pages/tenant/PathwaysCompare.tsx','utf8');
  expect(abroad).toContain("requested === 'Pakistan'");
  expect(abroad).toContain('to="/pakistan"');
 });
 it('shows every reviewed named OTHM/Qualifi university with no invented Canadian partner',()=>{
  expect(universityProgressionDirectory.length).toBeGreaterThanOrEqual(50);
  expect(new Set(universityProgressionDirectory.map(x=>x.id)).size).toBe(universityProgressionDirectory.length);
  expect(progressionCountries).toEqual(['UK','USA','Australia','Canada']);
  expect(filterProgressionUniversities({country:'Canada',body:'All',search:''})).toEqual([]);
  expect(canadaProgressionStatus).toMatch(/No university in Canada/);
  const usa=filterProgressionUniversities({country:'USA',body:'Qualifi',search:''});
  expect(usa).toHaveLength(8);
  expect(usa.some(x=>x.name==='Thomas Edison State University')).toBe(true);
  expect(filterProgressionUniversities({country:'USA',body:'OTHM',search:''})).toHaveLength(0);
  const aussie=filterProgressionUniversities({country:'Australia',body:'All',search:''});
  expect(aussie.some(x=>x.name==='Curtin University'&&x.bodies.includes('OTHM'))).toBe(true);
  expect(aussie.some(x=>x.name==='Edith Cowan University'&&x.bodies.includes('OTHM'))).toBe(true);
  expect(aussie.some(x=>x.name==='University of New England'&&x.bodies.includes('Qualifi'))).toBe(true);
  expect(filterProgressionUniversities({country:'UK',body:'OTHM',search:'Arden'})).toHaveLength(1);
  expect(filterProgressionUniversities({country:'UK',body:'Qualifi',search:'Arden'})).toHaveLength(1);
  expect(PROGRESSION_SOURCE.OTHM).toMatch(/^https:\/\/othm\.org\.uk\//);
  expect(PROGRESSION_SOURCE.QualifiUSA).toMatch(/^https:\/\/qualifi\.net\//);
 });
 it('keeps source evidence internal and university enquiry on UniPathway pages',()=>{
  const page=readFileSync('src/pages/promo/UniversityProgressionDirectory.tsx','utf8');
  expect(page).not.toContain('href={u.evidence');
  expect(page).not.toContain('href={u.source');
  expect(page).toContain('Discuss this university');
  expect(page).toContain('university=');
  const app=readFileSync('src/App.tsx','utf8');
  expect(app).toContain('path="/university-progression"');
  expect(app).toContain('const { search, hash } = useLocation()');
 });
});
