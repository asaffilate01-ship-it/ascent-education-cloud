import {describe,it,expect} from 'vitest';
import {loginAuditCentre,verifyLoginAudit} from './institutionalLoginAudit';
const centre='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const row={id:'20000000-0000-4000-8000-000000000001',centre_id:centre,email_at_event:'student@unipathway.pk',event_kind:'session_created',occurred_at:'2026-11-27T08:00:00Z',ip:'192.0.2.10',aal:'aal1'};
const snapshot={centre_id:centre,days:7,email_filter:null,reviewed_at:'2026-11-27T09:00:00Z',events:[row],truncated:false};
describe('institutional login audit',()=>{
 it('requires the selected verified superadmin role and a centre',()=>{
  const user={id:'reviewer',tenantId:centre,role:'superadmin',roles:['superadmin']};
  expect(loginAuditCentre(user)).toBe(centre);
  expect(loginAuditCentre({...user,role:'centre_director'})).toBeNull();
  expect(loginAuditCentre({...user,roles:['centre_director']})).toBeNull();
  expect(loginAuditCentre({...user,tenantId:undefined})).toBeNull();
 });
 it('accepts recorded IP and rejects foreign, duplicate, out-of-range or unverified records',()=>{
  expect(verifyLoginAudit(snapshot,centre,7,null).events).toEqual([row]);
  for(const invalid of [{...row,centre_id:other},{...row,email_at_event:'other@example.com'},{...row,ip:'<script>'},{...row,occurred_at:'2026-11-01T08:00:00Z'},{...row,occurred_at:'2026-11-27T10:00:00Z'}])expect(()=>verifyLoginAudit({...snapshot,events:[invalid]},centre,7,null)).toThrow();
  expect(()=>verifyLoginAudit({...snapshot,events:[row,row]},centre,7,null)).toThrow();
  expect(()=>verifyLoginAudit({...snapshot,truncated:true},centre,7,null)).toThrow();
  expect(()=>verifyLoginAudit(snapshot,centre,30,null)).toThrow();
  expect(()=>verifyLoginAudit(snapshot,centre,7,'other@unipathway.pk')).toThrow();
 });
 it('retains an honest empty verified result and permits unknown IP',()=>{
  expect(verifyLoginAudit({...snapshot,events:[]},centre,7,null).events).toEqual([]);
  expect(verifyLoginAudit({...snapshot,events:[{...row,ip:null,aal:null}]},centre,7,null).events[0].ip).toBeNull();
 });
});
