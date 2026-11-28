import {describe,it,expect} from 'vitest';
import {cctvViewingAllowed} from '../../supabase/functions/_shared/cctvPermissions';
const member=(role:string,tenant_id:string|null,user_id='user-a')=>({role,tenant_id,user_id});
const camera={security_live:true,security_playback:false};
const allowed=(rows:unknown,mode:'live'|'playback'='live')=>cctvViewingAllowed(rows,'user-a','centre-a',mode,camera);
describe('CCTV centre-scoped permissions',()=>{
 it('denies role mixing across centres or users',()=>{
  expect(allowed([member('centre_director','centre-b'),member('lecturer','centre-a')])).toBe(false);
  expect(allowed([member('security_officer','centre-b'),member('student','centre-a')])).toBe(false);
  expect(allowed([member('centre_director','centre-a','user-b')])).toBe(false);
  expect(allowed([member('centre_director',null)])).toBe(false);
  expect(allowed(null)).toBe(false);
 });
 it('honours local security permissions and verified global ownership',()=>{
  expect(allowed([member('security_officer','centre-a')])).toBe(true);
  expect(allowed([member('security_officer','centre-a')],'playback')).toBe(false);
  expect(allowed([member('centre_director','centre-a')],'playback')).toBe(true);
  expect(allowed([member('superadmin',null)],'playback')).toBe(true);
  expect(allowed([member('superadmin','centre-b')])).toBe(false);
 });
});
