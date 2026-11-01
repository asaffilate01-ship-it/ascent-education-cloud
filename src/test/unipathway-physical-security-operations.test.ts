
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {physicalSecurityScope,requireCentreRows,deviceHealth,occupancyStats,visitorStats,validateVisitorReceipt} from '@/lib/physicalSecurity';
const user=(role:string,roles:string[]= [role],tenantId?:string)=>({id:'actor',role,roles,tenantId});
describe('UniPathway physical security permissions and operational honesty',()=>{
 it('rejects role-switch privileges, unrelated roles and global-only owners',()=>{
  expect(physicalSecurityScope(user('student',['student','security_officer'],'centre-a'))).toBeNull();
  expect(physicalSecurityScope(user('security_officer',['security_officer'],'centre-a'))).toBe('centre-a');
  expect(physicalSecurityScope(user('centre_director',['centre_director'],'centre-a'))).toBe('centre-a');
  expect(physicalSecurityScope(user('superadmin',['superadmin']))).toBeNull();
  expect(physicalSecurityScope(user('security_officer',['security_officer']))).toBeNull();
 });
 it('denies a mixed-centre response instead of silently counting another centre',()=>{
  expect(()=>requireCentreRows([{tenant_id:'centre-a'},{tenant_id:'centre-b'}],'centre-a')).toThrow();
  expect(requireCentreRows([{tenant_id:'centre-a'}],'centre-a')).toHaveLength(1);
 });
 it('does not count previously recorded offline or stale devices as live',()=>{
  const now=Date.parse('2026-11-01T12:00:00Z');
  expect(deviceHealth('online','2026-11-01T11:59:00Z',now)).toBe('reported-online');
  expect(deviceHealth('online','2026-11-01T11:00:00Z',now)).toBe('stale');
  expect(deviceHealth('online',null,now)).toBe('stale');
  expect(deviceHealth('offline','2026-11-01T11:59:00Z',now)).toBe('offline');
 });
 it('counts only recorded active people and passes',()=>{
  expect(occupancyStats([{tenant_id:'a',person_key:'x',person_type:'visitor',in_building:true,last_event_at:null,last_gate_id:null},{tenant_id:'a',person_key:'y',person_type:'staff',in_building:false,last_event_at:null,last_gate_id:null}])).toEqual({inside:1,visitors:1,learnersAndStaff:0});
  expect(visitorStats([{id:'v',tenant_id:'a',full_name:'X',pass_number:'P',purpose:null,status:'in_building',checked_in_at:null,checked_out_at:null,created_at:''}])).toEqual({inside:1,preRegistered:0,checkedOut:0});
 });
 it('rejects foreign or inconsistent server visitor receipts',()=>{
  expect(validateVisitorReceipt({id:'v',tenant_id:'centre-a',status:'checked_out',pass_number:'UP-9'},'centre-a','checked_out','v').id).toBe('v');
  expect(()=>validateVisitorReceipt({id:'v',tenant_id:'centre-b',status:'checked_out',pass_number:'UP-9'},'centre-a','checked_out')).toThrow();
  expect(()=>validateVisitorReceipt({id:'v',tenant_id:'centre-a',status:'in_building',pass_number:'UP-9'},'centre-a','checked_out')).toThrow();
 });
 it('keeps unsafe historical security files disabled until explicit server deployment and centre role',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  const gate=readFileSync('src/components/security/PhysicalSecurityReadiness.tsx','utf8');
  const hook=readFileSync('src/hooks/useScopedSecurityRows.ts','utf8');
  for(const route of ['/security/operations','/security/centre','/security/visitors','/security/muster'])expect(app).toContain(`path="${route}" element={<RoleGuard allowed={['security_officer','centre_director']}`);
  expect(gate).toContain('PHYSICAL_SECURITY_ENABLED');
  expect(hook).toContain(".eq('tenant_id',tenant)");
  expect(hook).toContain('requireCentreRows');
  for(const path of ['src/pages/security/CentreSecurity.tsx','src/pages/security/VisitorReception.tsx','src/pages/security/MusterMode.tsx','src/pages/security/SecurityCommandCentre.tsx']){
   const s=readFileSync(path,'utf8');expect(s).not.toContain("select('*')");expect(s).toContain('useScopedSecurityRows');
  }
 });
});
