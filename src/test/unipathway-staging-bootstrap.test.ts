import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const dir='scripts/';
const stagingEnv={
 STAGING_RUN_ACK:'UNIPATHWAY_STAGING_ONLY',
 STAGING_PROJECT_REF:'abcdefghijklmnopqrst',
 UNIPATHWAY_PRODUCTION_PROJECT_REF:'zyxwvutsrqponmlkjihg',
 STAGING_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co/'
};
function run(script:string,args:string[],env:Record<string,string>={}){
 return spawnSync(process.execPath,[dir+script,...args],{
  env:{...process.env,...stagingEnv,...env},
  encoding:'utf8',timeout:12000,maxBuffer:1024*1024*2
 });
}
describe('UniPathway no-cost, isolation-first staging bootstrap',()=>{
 it('describes 17 named roles plus two isolation students without creating accounts',()=>{
  const result=run('bootstrap-unipathway-staging-accounts.mjs',['--plan']);
  expect(result.status).toBe(0);
  const plan=JSON.parse(result.stdout);
  expect(plan.mode).toBe('plan');
  expect(plan.writes).toBe(0);
  expect(plan.accounts).toHaveLength(19);
  expect(new Set(plan.accounts.map((x:{email:string})=>x.email)).size).toBe(19);
  expect(plan.accounts.find((x:{fixture:string})=>x.fixture==='superadmin').scope).toBe('global');
  expect(plan.accounts.find((x:{fixture:string})=>x.fixture==='studentB').scope).toBe('tenantB');
  expect(result.stdout).not.toContain('password');
 });
 it('refuses staging-account writes without separate explicit approval',()=>{
  const result=run('bootstrap-unipathway-staging-accounts.mjs',['--apply']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Explicit staging fixture write approval required');
 });
 it('refuses production and unchecked repository ref even when confirmation present',()=>{
  const production=run('bootstrap-unipathway-staging-accounts.mjs',['--plan'],{
   UNIPATHWAY_PRODUCTION_PROJECT_REF:stagingEnv.STAGING_PROJECT_REF
  });
  expect(production.status).not.toBe(0);
  expect(production.stderr).toContain('Refusing production or ambiguous');
  const unchecked=run('init-unipathway-staging-tenants.mjs',['--plan'],{
   STAGING_PROJECT_REF:'sthrhcmjypwuorlbscfw',
   STAGING_SUPABASE_URL:'https://sthrhcmjypwuorlbscfw.supabase.co/'
  });
  expect(unchecked.status).not.toBe(0);
  expect(unchecked.stderr).toContain('ambiguous');
 });
 it('plans two synthetic QA tenants without writing database rows',()=>{
  const result=run('init-unipathway-staging-tenants.mjs',['--plan']);
  expect(result.status).toBe(0);
  const plan=JSON.parse(result.stdout);
  expect(plan.tenants).toHaveLength(2);
  expect(plan.tenants.every((x:{slug:string})=>x.slug.startsWith('unipathway-qa-tenant-'))).toBe(true);
  expect(plan.mode).toBe('plan');
 });
 it('lists every repository migration with non-execution and high-risk SQL warnings',()=>{
  const result=run('plan-unipathway-migrations.mjs',['--json']);
  expect(result.status).toBe(0);
  const json=JSON.parse(result.stdout);
  expect(json.summary.count).toBeGreaterThan(80);
  expect(json.summary.requiredStages.every((x:{present:boolean})=>x.present)).toBe(true);
  expect(json.summary.duplicateVersions).toEqual([]);
  expect(json.staging).toBeNull();
  expect(result.stdout).not.toContain('STAGING_SERVICE_ROLE_KEY');
 });
 it('blocks an unconfigured live staging inspection',()=>{
  const result=run('plan-unipathway-migrations.mjs',['--staging','--json']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Missing staging-only direct database URL');
 });
 it('has no browser-accessible service role or shared test-password defaults',()=>{
  for(const path of [
   'scripts/bootstrap-unipathway-staging-accounts.mjs',
   'scripts/init-unipathway-staging-tenants.mjs',
   'scripts/lib/unipathway-staging-guard.mjs'
  ]){
   const text=readFileSync(path,'utf8');
   expect(text).not.toContain('DEV_ACCOUNT_PASSWORD');
   expect(text).not.toContain('localStorage');
   expect(text).not.toContain('admin.auth.admin.updateUserById');
  }
 });
});
