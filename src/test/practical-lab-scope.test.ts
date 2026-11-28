import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {readLabPages,readLabIdBatches,verifyLabRows,verifyLabRequestHistory,labAttemptSummary,labReceiptId} from '@/lib/practicalLabScope';

const request=(id:string,changes:Record<string,unknown>={})=>({id,tenant_id:'centre-a',student_id:'student-a',template_id:'lab-a',status:'stopped',mode:'self_study',class_run_id:null,...changes});
const source=(rows:unknown[])=>()=>({order:()=>({range:async(from:number,to:number)=>({data:rows.slice(from,to+1),error:null})})});
describe('practical lab scope and complete attempt history',()=>{
 it('reads more than the previous request limit and counts all chargeable recorded attempts',async()=>{
  const rows=Array.from({length:601},(_,i)=>request(String(i)));
  rows.push(request('failed',{status:'failed'}),request('cancelled',{status:'cancelled'}),request('other',{template_id:'lab-b'}));
  const read=await readLabPages(source(rows),()=>true);
  const verified=verifyLabRequestHistory<ReturnType<typeof request>>(read,'centre-a','student-a');
  expect(verified).toHaveLength(604);
  expect(labAttemptSummary(verified,'lab-a')).toEqual({used:601,active:false});
 });
 it('rejects partial, oversized and superseded pages instead of returning a false total',async()=>{
  let count=0;
  const fail=()=>({order:()=>({range:async()=>++count===1?{data:Array.from({length:250},(_,i)=>request(String(i))),error:null}:{data:null,error:{message:'failed'}}})});
  await expect(readLabPages(fail,()=>true)).rejects.toThrow();
  await expect(readLabPages(()=>({order:()=>({range:async()=>({data:Array.from({length:251},(_,i)=>request(String(i))),error:null})})}),()=>true)).rejects.toThrow();
  await expect(readLabPages(source([]),()=>false)).rejects.toThrow();
  await expect(readLabPages(source(Array.from({length:10001},(_,i)=>request(String(i)))),()=>true)).rejects.toThrow();
 });
 it('batches permitted IDs and uses a stable ordering key for invitation rows',async()=>{
  const ids=Array.from({length:101},(_,i)=>String(i));
  const order=vi.fn((key:string)=>({range:async()=>({data:[],error:null})}));
  const query=vi.fn((group:string[])=>({order}));
  await readLabIdBatches([...ids,ids[0]],query,()=>true,'class_run_id');
  expect(query.mock.calls.map(call=>call[0].length)).toEqual([50,50,1]);
  expect(order).toHaveBeenCalledWith('class_run_id');
 });
 it('rejects foreign learners, centres, duplicate requests and conflicting active requests',()=>{
  for(const rows of [
   [request('one',{student_id:'student-b'})],
   [request('one',{tenant_id:'centre-b'})],
   [request('one'),request('one')],
   [request('one',{status:'active'}),request('two',{status:'awaiting_provider'})],
   [request('one',{status:'unknown'})],
   [request('one',{mode:'class'})],
  ])expect(()=>verifyLabRequestHistory(rows,'centre-a','student-a')).toThrow();
  expect(labAttemptSummary([request('one',{status:'active'})],'lab-a')).toEqual({used:1,active:true});
 });
 it('verifies invitation keys and rejects non-UUID mutation receipts',()=>{
  const invitation={tenant_id:'centre-a',student_id:'student-a',class_run_id:'run-a'};
  expect(verifyLabRows([invitation],'centre-a','student-a','class_run_id')).toHaveLength(1);
  expect(()=>verifyLabRows([invitation,invitation],'centre-a','student-a','class_run_id')).toThrow();
  expect(labReceiptId('00000000-0000-4000-8000-000000000001')).toBe(true);
  for(const invalid of [null,true,{},'success',''])expect(labReceiptId(invalid)).toBe(false);
 });
 it('keeps launch, notes and support writes guarded by verified receipts and explicit refresh',()=>{
  const hub=readFileSync('src/pages/labs/LabLearningHub.tsx','utf8');
  expect(hub).toContain('writeLock.current=true');
  expect(hub).toContain('labReceiptId(result.data)');
  expect(hub).toContain('verify(result.data,snapshot)');
  expect(hub).toContain('setNeedsRefresh(true)');
  expect(hub).not.toContain('.limit(150)');
  expect(hub).toContain('No AWS machine has started yet');
  expect(readFileSync('src/components/labs/TechLabAccessGate.tsx','utf8')).toContain('ScopedTechLabAccess key=');
 });
});
