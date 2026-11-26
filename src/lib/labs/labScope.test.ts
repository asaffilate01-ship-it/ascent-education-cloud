import {describe,it,expect} from 'vitest';
import {verifiedLabScope,labPrincipalKey,labSessionStorageKey,readScopedLabSession,writeScopedLabSession,labSessionMatches,labAttemptMatches,type LabScope} from './labScope';
const a:LabScope={id:'learner-a',tenantId:'centre-a',role:'student'};
const b:LabScope={id:'learner-b',tenantId:'centre-a',role:'student'};
const session='12345678-1234-4234-8234-123456789abc';
function memoryStorage(){
 const rows=new Map<string,string>();
 return {getItem:(key:string)=>rows.get(key)??null,setItem:(key:string,value:string)=>{rows.set(key,value);},removeItem:(key:string)=>{rows.delete(key);}};
}
describe('interactive lab account scope',()=>{
 it('requires a verified allowed role and centre',()=>{
  expect(verifiedLabScope({...a,roles:['student']})).toEqual(a);
  expect(verifiedLabScope({...a,roles:['lecturer']})).toBeNull();
  expect(verifiedLabScope({...a,tenantId:'',roles:['student']})).toBeNull();
  expect(verifiedLabScope({...a,role:'finance_officer',roles:['finance_officer']})).toBeNull();
  expect(verifiedLabScope(null)).toBeNull();
 });
 it('isolates account, tenant, role and lab kind; ignores old global keys',()=>{
  const storage=memoryStorage();
  storage.setItem('unipathway-live-lab-tech',session);
  expect(readScopedLabSession(storage,'tech',a)).toBeNull();
  expect(storage.getItem('unipathway-live-lab-tech')).toBeNull();
  writeScopedLabSession(storage,'tech',a,session);
  expect(readScopedLabSession(storage,'tech',a)).toBe(session);
  expect(readScopedLabSession(storage,'tech',b)).toBeNull();
  expect(readScopedLabSession(storage,'tech',{...a,tenantId:'centre-b'})).toBeNull();
  expect(readScopedLabSession(storage,'tech',{...a,role:'lecturer'})).toBeNull();
  expect(readScopedLabSession(storage,'language',a)).toBeNull();
  expect(labPrincipalKey(a)).not.toBe(labPrincipalKey(b));
  storage.setItem(labSessionStorageKey('tech',a),'forged-id');
  expect(readScopedLabSession(storage,'tech',a)).toBeNull();
  writeScopedLabSession(storage,'tech',a,null);
  expect(storage.getItem(labSessionStorageKey('tech',a))).toBeNull();
 });
 it('handles storage restrictions without exposing data',()=>{
  const storage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};
  expect(readScopedLabSession(storage,'tech',a)).toBeNull();
  expect(()=>writeScopedLabSession(storage,'tech',a,session)).not.toThrow();
 });
 it('rejects foreign centre, wrong kind, malformed and unexpected session records',()=>{
  const row={id:session,tenant_id:a.tenantId,kind:'tech',status:'live'};
  expect(labSessionMatches(row,a,'tech',session)).toBe(true);
  expect(labSessionMatches({...row,tenant_id:'centre-b'},a,'tech',session)).toBe(false);
  expect(labSessionMatches(row,a,'language',session)).toBe(false);
  expect(labSessionMatches({...row,status:'unknown'},a,'tech',session)).toBe(false);
  expect(labSessionMatches(null,a,'tech',session)).toBe(false);
 });
 it('does not accept attempt history from another user or centre',()=>{
  const row={user_id:a.id,tenant_id:a.tenantId,lab_kind:'tech'};
  expect(labAttemptMatches(row,a,'tech')).toBe(true);
  expect(labAttemptMatches(row,b,'tech')).toBe(false);
  expect(labAttemptMatches({...row,tenant_id:'centre-b'},a,'tech')).toBe(false);
  expect(labAttemptMatches(row,a,'language')).toBe(false);
 });
});
