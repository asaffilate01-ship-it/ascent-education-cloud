import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const calculator=readFileSync('src/components/StudySavingsCalculator.tsx','utf8');
const language=readFileSync('src/components/tenant/LanguageAcademy.tsx','utf8');
const study=readFileSync('src/pages/promo/StudyPriorities.tsx','utf8');
describe('UniPathway language discovery and international calculator wiring',()=>{
 it('publishes French Italian Spanish preparation within the public study route',()=>{
  expect(study).toContain('<LanguageAcademy track="spanish" />');
  expect(study).toContain('<LanguageAcademy track="french" />');
  expect(study).toContain('<LanguageAcademy track="italian" />');
  expect(language).toContain("track: 'german' | 'english' | 'french' | 'italian' | 'spanish'");
  for(const exam of ['DELE/SIELE','DELF/DALF/TCF','CILS/CELI'])expect(language).toContain(exam);
  expect(study).toContain('Language courses do not guarantee university admission');
 });
 it('keeps calculation based on actual entered quote amounts and stage duration',()=>{
  expect(calculator).toContain("years*(num(c.tuition)+num(c.living)+num(c.extras))+num(c.travel)");
  expect(calculator).toContain("mode==='pakistan-first'?");
  expect(calculator).toContain('Math.max(0,years-pakistanYears)');
  expect(calculator).not.toContain('difference:ours-theirs');
  expect(calculator).toContain('difference:theirs-ours');
 });
 it('fetches dated exchange rates, checks freshness and converts amounts safely',()=>{
  expect(calculator).toContain('https://open.er-api.com/v6/latest/USD');
  expect(calculator).toContain("data.result!=='success'");
  expect(calculator).toContain('Date.now()-updated>7*24*60*60*1000');
  expect(calculator).toContain('fx.rates[next]/fx.rates[currency]');
  expect(calculator).toContain("if(!fx){");
  expect(calculator).toContain('setOverseas(convert);setPakistan(convert);setAlternative(convert);setCurrency(next)');
  expect(calculator).toContain('Rates are indicative');
 });
});
