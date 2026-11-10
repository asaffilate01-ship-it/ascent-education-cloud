import {describe,it,expect} from 'vitest';
import {qualificationSelection,officialAwardingBodies} from '@/lib/qualificationSelection';

describe('ATHE proposed catalogue source and approval boundaries',()=>{
 const athe=qualificationSelection.filter(q=>q.body==='ATHE');
 it('includes selected Level 3–5 qualifications supported by individual official source pages',()=>{
  expect(athe).toHaveLength(7);
  expect(new Set(athe.map(q=>q.name)).size).toBe(athe.length);
  expect(new Set(athe.map(q=>q.source)).size).toBe(athe.length);
  expect(athe.map(q=>q.level).sort()).toEqual([3,4,4,5,5,5,5]);
  expect(athe.every(q=>q.source.startsWith('https://athe.co.uk/qualifications/athe-'))).toBe(true);
  expect(officialAwardingBodies.ATHE.url).toBe('https://athe.co.uk/qualifications/');
 });
 it('does not reuse known withdrawn qualification names in the new ATHE selection',()=>{
  const banned=['Level 4 Diploma in Business and Management','Level 5 Diploma in Business and Management','Level 4 Diploma in Computing','Level 5 Diploma in Computing'];
  // The legacy names without the published version year have been withdrawn.
  expect(athe.filter(q=>banned.includes(q.name))).toHaveLength(0);
  expect(athe.some(q=>q.name==='Level 4 Diploma in Business and Management (2023)')).toBe(true);
  expect(athe.some(q=>q.name==='Level 5 Diploma in Computing (2024)')).toBe(true);
 });
 it('does not claim approval, fees or an intake for a proposed catalogue title',()=>{
  expect(athe.every(q=>!('approval' in q||'fees' in q||'intake' in q))).toBe(true);
 });
});
