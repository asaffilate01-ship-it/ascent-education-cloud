import {describe,expect,it} from 'vitest';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {verifiedDemoConfig,verifyDemoMemberships,DEMO_ROLES,DEMO_ACK,DEMO_TAG,DEMO_EMAIL} from '../../scripts/lib/unipathway-demo-guard.mjs';
const demoRef='abcdefghijklmnopqrst',prodRef='zyxwvutsrqponmlkjihg';
const userId='00000000-0000-4000-8000-000000000001',tenantId='00000000-0000-4000-8000-000000000002';
const env={APP_ENV:'demo',DEMO_RUN_ACK:DEMO_ACK,DEMO_PROJECT_REF:demoRef,UNIPATHWAY_PRODUCTION_PROJECT_REF:prodRef,
 DEMO_SUPABASE_URL:'https://'+demoRef+'.supabase.co',DEMO_ORIGIN:'https://demo.unipathway.pk',
 DEMO_PUBLISHABLE_KEY:'sb_publishable_example',DEMO_USER_ID:userId,DEMO_TENANT_ID:tenantId,DEMO_ACCOUNT_PASSWORD:'synthetic-test-value'};
const fixture=()=>({
 user:{id:userId,email:DEMO_EMAIL,email_confirmed_at:'2026-11-28T00:00:00Z',app_metadata:{fixture_namespace:DEMO_TAG}},
 profile:{user_id:userId,email:DEMO_EMAIL,tenant_id:tenantId},
 centre:{id:tenantId,slug:'unipathway-demo'},
 memberships:DEMO_ROLES.map(role=>({user_id:userId,role,tenant_id:role==='superadmin'?null:tenantId})),
});
describe('protected isolated demonstration acceptance',()=>{
 it('matches all 21 roles in the real application catalogue',()=>{
  expect([...DEMO_ROLES].sort()).toEqual([...KNOWN_UNIPATHWAY_ROLES].sort());
  expect(verifyDemoMemberships(fixture(),verifiedDemoConfig(env))).toEqual({verifiedRoles:21,centreVerified:true,accountVerified:true});
 });
 it('rejects the production ref, ambiguous repository project, mismatched URL and privileged key',()=>{
  for(const patch of [
   {DEMO_RUN_ACK:''},{APP_ENV:'production'},{DEMO_PROJECT_REF:prodRef,DEMO_SUPABASE_URL:'https://'+prodRef+'.supabase.co'},
   {DEMO_PROJECT_REF:'sthrhcmjypwuorlbscfw',DEMO_SUPABASE_URL:'https://sthrhcmjypwuorlbscfw.supabase.co'},
   {DEMO_SUPABASE_URL:'https://'+prodRef+'.supabase.co'},{DEMO_ORIGIN:'https://unipathway.pk'},
   {DEMO_ORIGIN:'https://demo.unipathway.pk/other'},{DEMO_PUBLISHABLE_KEY:'sb_secret_example'},
   {DEMO_PUBLISHABLE_KEY:'service-role'},{DEMO_ACCOUNT_PASSWORD:''},{DEMO_TENANT_ID:userId},
  ])expect(()=>verifiedDemoConfig({...env,...patch})).toThrow();
 });
 it('requires a matching anonymous legacy key rather than a privileged or foreign JWT',()=>{
  const jwt=(role:string,ref:string)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role,ref})).toString('base64url')+'.synthetic';
  expect(verifiedDemoConfig({...env,DEMO_PUBLISHABLE_KEY:jwt('anon',demoRef)}).ref).toBe(demoRef);
  expect(()=>verifiedDemoConfig({...env,DEMO_PUBLISHABLE_KEY:jwt('service_role',demoRef)})).toThrow();
  expect(()=>verifiedDemoConfig({...env,DEMO_PUBLISHABLE_KEY:jwt('anon',prodRef)})).toThrow();
 });
 it('rejects missing roles, duplicates, wrong role scope and untagged identities',()=>{
  const config=verifiedDemoConfig(env),good=fixture();
  for(const input of [
   {...good,memberships:good.memberships.slice(1)},
   {...good,memberships:[...good.memberships.slice(1),good.memberships[1]]},
   {...good,memberships:good.memberships.map(r=>r.role==='superadmin'?{...r,tenant_id:tenantId}:r)},
   {...good,memberships:good.memberships.map(r=>r.role==='student'?{...r,tenant_id:userId}:r)},
   {...good,user:{...good.user,app_metadata:{}}},
   {...good,centre:{...good.centre,slug:'unipathway'}},
   {...good,profile:{...good.profile,tenant_id:userId}}
  ])expect(()=>verifyDemoMemberships(input,config)).toThrow();
 });
});
