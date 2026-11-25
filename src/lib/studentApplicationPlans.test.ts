import {describe,it,expect} from 'vitest';
import {verifyStudentPlans} from './studentApplicationPlans';
const row={id:'10000000-0000-4000-8000-000000000001',tenant_id:'centre-a',owner_id:'student-a',title:'University deadline',category:'University application',planning_date:'2027-02-01',completed:false};
describe('student application planning snapshot',()=>{
 it('accepts verified empty and owner-bound records',()=>{
  expect(verifyStudentPlans([],'centre-a','student-a')).toEqual([]);
  expect(verifyStudentPlans([row],'centre-a','student-a')[0]).toMatchObject({title:row.title,date:row.planning_date,kind:row.category,source:'',completed:false});
 });
 it('rejects cross-owner, cross-centre and duplicate rows',()=>{
  for(const rows of [[{...row,owner_id:'student-b'}],[{...row,tenant_id:'centre-b'}],[row,row]])expect(()=>verifyStudentPlans(rows,'centre-a','student-a')).toThrow();
 });
 it('rejects invalid categories, dates, identifiers and malformed responses',()=>{
  for(const rows of [null,[null],[{...row,category:'Unknown'}],[{...row,planning_date:'2027-02-29'}],[{...row,id:'not-a-uuid'}],[{...row,completed:'false'}]])expect(()=>verifyStudentPlans(rows,'centre-a','student-a')).toThrow();
 });
});
