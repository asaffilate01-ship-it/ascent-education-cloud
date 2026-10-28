import {expect,it} from 'vitest';
import {prepareDraftRestore} from '@/lib/assessment/draftRestore';
const rubric=[{criterion_code:'A',max_points:50},{criterion_code:'B',max_points:'50'}];
const source={revision:2,criteria:{A:{code:'A',points:4,reason:'Reason',evidence:'Page 2',missing:'Compare alternatives',extra:'Never copy hidden fields'}},feedback:'Old individual wording',guidance:'Develop the explanation.'};
it('copies only content into independent objects without carrying the historical revision or extra fields',()=>{
 const content=prepareDraftRestore(source,rubric)!;expect(content).toEqual({criteria:{A:{code:'A',points:4,reason:'Reason',evidence:'Page 2',missing:'Compare alternatives'}},feedback:source.feedback,guidance:source.guidance});
 content.criteria.A.points=20;expect(source.criteria.A.points).toBe(4);expect(content).not.toHaveProperty('revision');
});
it('supports intentionally incomplete criteria and blank feedback without inventing evidence',()=>{
 expect(prepareDraftRestore({criteria:{},feedback:'',guidance:''},rubric)).toEqual({criteria:{},feedback:'',guidance:''});
});
it('rejects metadata-only, malformed or oversized content',()=>{
 for(const value of [null,{},[],{...source,criteria:null},{...source,criteria:[]},{...source,feedback:null},{...source,guidance:null},{...source,feedback:'x'.repeat(6001)},{...source,guidance:'x'.repeat(6001)}])expect(prepareDraftRestore(value,rubric)).toBeNull();
 for(const patch of [{code:'B'},{points:-1},{points:51},{points:NaN},{points:Infinity},{points:'4'},{reason:null},{reason:'x'.repeat(2001)},{evidence:'x'.repeat(901)},{missing:'x'.repeat(2001)}])expect(prepareDraftRestore({...source,criteria:{A:{...source.criteria.A,...patch}}},rubric)).toBeNull();
});
it('rejects removed criteria, lower current point limits and unavailable or inconsistent rubrics',()=>{
 expect(prepareDraftRestore(source,[rubric[1]])).toBeNull();expect(prepareDraftRestore(source,[{criterion_code:'A',max_points:3}])).toBeNull();
 for(const r of [[],[{criterion_code:'A',max_points:NaN}],[rubric[0],rubric[0]]])expect(prepareDraftRestore(source,r)).toBeNull();
});
it('enforces the combined JSON byte bound even when individual text fields fit',()=>{
 const r=Array.from({length:50},(_,i)=>({criterion_code:`C${i}`,max_points:5}));
 const criteria=Object.fromEntries(r.map(c=>[c.criterion_code,{code:c.criterion_code,points:0,reason:'界'.repeat(1900),evidence:'',missing:''}]));
 expect(prepareDraftRestore({criteria,feedback:'',guidance:''},r)).toBeNull();
});
