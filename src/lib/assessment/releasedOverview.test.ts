import {describe,expect,it} from 'vitest';
import {verifiedReleasedOverview} from './releasedOverview';

const student='learner-a',centre='centre-a';
const release=(attempt_id:string,score=75,opts:Record<string,unknown>={})=>({
 attempt_id,brief_id:'brief-1',student_id:student,tenant_id:centre,
 final_score:score,released_at:'2026-11-12T09:00:00Z',...opts,
});
const amended=(attempt_id:string,score=88,opts:Record<string,unknown>={})=>({
 attempt_id,brief_id:'brief-1',student_id:student,tenant_id:centre,
 corrected_final_score:score,...opts,
});
const brief=(id='brief-1',opts:Record<string,unknown>={})=>({
 id,tenant_id:centre,module_id:'module-a',title:'Assessment by an independent marker',...opts,
});
const summary=(r:unknown=[release('attempt-1')],a:unknown=[],b:unknown=[brief()])=>
 verifiedReleasedOverview(r,a,b,student,centre);

describe('verified released results overview',()=>{
 it('uses only independently released attempts and applies one verified appeal correction including zero',()=>{
  const s=summary([release('a',72),release('b',100,{released_at:'2026-11-13T09:00:00Z'})],
   [amended('a',0)],[brief()]);
  expect(s.results.map(x=>({id:x.attemptId,score:x.score,amended:x.amended}))).toEqual([
   {id:'b',score:100,amended:false},{id:'a',score:0,amended:true},
  ]);
  expect(s.average).toBe(50);
  expect(s.total).toBe(2);
  expect(s.results[1]).toMatchObject({briefTitle:'Assessment by an independent marker',moduleId:'module-a'});
 });
 it('treats no independently released results as no average without inventing a mark',()=>{
  expect(summary([],[],[])).toEqual({results:[],average:null,total:0});
 });
 it('preserves a generic protected feedback link when authorised brief metadata is absent',()=>{
  const s=summary([release('a',63)],[],[]);
  expect(s.results[0]).toMatchObject({score:63,briefTitle:null,moduleId:null});
  expect(s.average).toBe(63);
 });
 it('rejects duplicate, nonnumeric, out-of-range or cross-account released grades',()=>{
  for(const rows of [
    [release('a'),release('a')],
    [release('a',Number.NaN)],
    [release('a',101)],
    [release('a',-0.1)],
    [release('a',75,{final_score:'75'})],
    [release('a',75,{student_id:'another-learner'})],
    [release('a',75,{tenant_id:'centre-b'})],
    [release('a',75,{released_at:'not a date'})],
    [release('a',75,{brief_id:''})],
  ])expect(()=>summary(rows)).toThrow();
 });
 it('never trusts an unlinked, mismatched, duplicated or malformed appeal correction',()=>{
  for(const a of [
    [amended('missing')],
    [amended('a',80,{brief_id:'different'})],
    [amended('a',80,{tenant_id:'centre-b'})],
    [amended('a',80,{student_id:'different'})],
    [amended('a',80),amended('a',82)],
    [amended('a',105)],
    [amended('a',-1)],
    [amended('a',80,{corrected_final_score:'80'})],
  ])expect(()=>summary([release('a')],a)).toThrow();
 });
 it('rejects cross-centre or duplicated metadata rather than exposing a foreign title',()=>{
  for(const b of [
    [brief('brief-1',{tenant_id:'centre-b'})],
    [brief(),brief()],
    [brief('brief-1',{title:''})],
    [brief('brief-1',{module_id:null})],
  ])expect(()=>summary([release('a')],[],b)).toThrow();
 });
 it('sorts results by release time and stable attempt id, not server response order',()=>{
  const s=summary([release('z',85),release('a',90),release('b',70,{released_at:'2026-11-14T09:00:00Z'})]);
  expect(s.results.map(x=>x.attemptId)).toEqual(['b','a','z']);
  expect(s.average).toBe(82);
 });
 it('limits release and correction snapshots to 100 rows to avoid claiming completeness',()=>{
  const many=Array.from({length:101},(_,i)=>release('a'+i));
  expect(()=>summary(many)).toThrow();
  expect(()=>verifiedReleasedOverview([],[],[],student,'')).toThrow();
 });
});
