import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const script=resolve(process.cwd(),'scripts/verify-unipathway-staging.mjs');
const ref='sthrhcmjypwuorlbscfw';
function run(env:Record<string,string>){
 const base={...process.env,
  STAGING_RUN_ACK:'',
  STAGING_PROJECT_REF:'',
  STAGING_SUPABASE_URL:'',
  STAGING_SUPABASE_ANON_KEY:'',
  STAGING_FIXTURES_JSON:'',
  ...env
 };
 return spawnSync(process.execPath,[script],{encoding:'utf8',timeout:10000,env:base});
}
describe('UniPathway staging gate refuses ambiguous or missing configuration',()=>{
 it('fails closed without staging confirmation',()=>{
  const p=run({});
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('STAGING_RUN_ACK');
 });
 it('rejects an unapproved or mismatched staging URL without requesting data',()=>{
  const p=run({
   STAGING_RUN_ACK:'UNIPATHWAY_STAGING_ONLY',
   STAGING_PROJECT_REF:ref,
   STAGING_SUPABASE_URL:'https://unrelated.supabase.co',
   STAGING_SUPABASE_ANON_KEY:'not-real'
  });
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('does not match');
 });
 it('rejects the repository config database because it has not been verified as staging',()=>{
  const p=run({
   STAGING_RUN_ACK:'UNIPATHWAY_STAGING_ONLY',
   STAGING_PROJECT_REF:ref,
   STAGING_SUPABASE_URL:'https://'+ref+'.supabase.co',
   STAGING_SUPABASE_ANON_KEY:'not-real'
  });
  expect(p.status).not.toBe(0);
  expect(p.stderr).toContain('not independently verified as staging');
 });
});
