import {describe,expect,it} from 'vitest';
import {europeanDestinations,euMemberCountries,otherEuropeanCountries,findEuropeanDestination,europePreparationStages} from '@/lib/europeanDestinations';
import {destinationLinks,studyLinks} from '@/components/PublicNav';
import {isPublicMobilePath,isMobileTabActive} from '@/lib/mobileTabRoutes';
import {readFileSync} from 'node:fs';

describe('UniPathway Europe education-first public directory',()=>{
 it('offers all EU countries with non-EU Europe clearly separated',()=>{
   expect(euMemberCountries.length).toBe(27);
   expect(otherEuropeanCountries.length).toBe(7);
   expect(europeanDestinations.length).toBe(34);
   const keys=europeanDestinations.map(x=>x.slug);
   expect(new Set(keys).size).toBe(keys.length);
   expect(findEuropeanDestination('ireland')?.membership).toBe('EU');
   expect(findEuropeanDestination('norway')?.membership).not.toBe('EU');
   expect(findEuropeanDestination('switzerland')?.membership).not.toBe('EU');
   expect(findEuropeanDestination('north-macedonia')?.country).toBe('North Macedonia');
   expect(findEuropeanDestination('does-not-exist')).toBeUndefined();
 });
 it('includes credible country language guidance and does not invent partnership status',()=>{
   for(const x of europeanDestinations){
     expect(x.universityExamples.length).toBeGreaterThan(0);
     expect(x.localLanguages.length).toBeGreaterThan(0);
     expect(x.fields.length).toBeGreaterThan(0);
     expect(x.languageNote.length).toBeGreaterThan(35);
     expect(x.admissionsNote).toContain('not guaranteed');
     expect(x.commissionReference.startsWith('https://')).toBe(true);
     expect(x.slug).toMatch(/^[a-z-]+$/);
   }
   expect(europePreparationStages.map(x=>x.label)).toEqual(['Learn','Train','Prepare','Progress','Settle & develop']);
 });
 it('wires all public Europe destinations and mobile tabs without redirecting users off site',()=>{
   const app=readFileSync('src/App.tsx','utf8');
   expect(app).toContain('path="/europe"');
   expect(app).toContain('path="/europe/:slug"');
   const page=readFileSync('src/pages/promo/EuropeStudyDirectory.tsx','utf8');
   expect(page).toContain("'/europe'");
   expect(page).toContain('/europe/${x.slug}');
   expect(page).toContain('We teach');
   expect(isPublicMobilePath('/europe/italy')).toBe(true);
   expect(isMobileTabActive('/pathways','/europe/france')).toBe(true);
   expect(destinationLinks.some(x=>x.to==='/europe')).toBe(true);
   expect(studyLinks.some(x=>x.to==='/europe')).toBe(true);
 });
});
