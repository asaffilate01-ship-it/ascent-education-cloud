import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('discloses that centre attendance is programme-specific rather than guaranteeing fixed blocks',()=>{
 const home=readFileSync('src/pages/promo/PromoHome.tsx','utf8');
 const qualifications=readFileSync('src/pages/promo/QualificationsCatalogue.tsx','utf8');
 expect(home).not.toContain('two 14-day centre visits');
 expect(qualifications).not.toContain('two 14-day centre-based academic visits');
 expect(qualifications).toContain('frequency and duration must be confirmed');
 expect(qualifications).toContain('current programme-specific approval');
 expect(qualifications).toContain('A Level 4 or 5 diploma is not itself a UK university degree');
});
