import {describe,expect,it} from 'vitest';
import {validOfficeSnapshot} from '@/lib/officeWorkspaceSnapshot';
const snapshot=()=>({centreId:'centre-a',role:'hr_officer',revision:0,capabilities:['view_leave_summary'],tasks:[],staff:[],schedule:[],leaveSummary:{pending:0,approved:2,rejected:0}});
describe('office snapshot integrity',()=>{
 it('accepts recorded zero, but denies absent, fractional, negative and nonfinite leave counts',()=>{
  expect(validOfficeSnapshot(snapshot(),'centre-a','hr_officer')).toBe(true);
  for(const pending of [undefined,null,'0',-1,0.5,NaN,Infinity]) expect(validOfficeSnapshot({...snapshot(),leaveSummary:{pending,approved:0,rejected:0}},'centre-a','hr_officer')).toBe(false);
 });
 it('requires matching centre, permitted role, revision and capability evidence',()=>{
  for(const change of [{centreId:'centre-b'},{role:'student'},{revision:undefined},{revision:-1},{capabilities:['unknown']},{leaveSummary:[]}])expect(validOfficeSnapshot({...snapshot(),...change},'centre-a','hr_officer')).toBe(false);
 });
 it('allows empty leave summary only when leave-summary capability is withheld',()=>{
  expect(validOfficeSnapshot({...snapshot(),capabilities:[],leaveSummary:{}},'centre-a','hr_officer')).toBe(true);
  expect(validOfficeSnapshot({...snapshot(),leaveSummary:{}},'centre-a','hr_officer')).toBe(false);
 });
 it('rejects invalid nested rows before the renderer can crash',()=>{
  for(const key of ['tasks','staff','schedule'])for(const row of [null,undefined,[],{}, {id:'x',title:{}}])expect(validOfficeSnapshot({...snapshot(),[key]:[row]},'centre-a','hr_officer')).toBe(false);
 });
 it('accepts the documented RPC task, person and schedule contracts',()=>{
  expect(validOfficeSnapshot({...snapshot(),tasks:[{id:'t',title:'Review plan',status:'pending',priority:'normal',dueOn:null}],staff:[{id:'u',name:null,email:null,role:'secretary'}],schedule:[{id:'s',day:0,start:'09:00:00',end:'10:00:00',room:null,module:'English'}]},'centre-a','hr_officer')).toBe(true);
 });
});
