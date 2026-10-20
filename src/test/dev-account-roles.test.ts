import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEV_ACCOUNTS } from '../../supabase/functions/seed-dev-users/accounts';

describe('requested test dashboard accounts', () => {
  it('retains the original fourteen accounts and adds three unique accounts', () => {
    expect(DEV_ACCOUNTS).toHaveLength(17);
    expect(new Set(DEV_ACCOUNTS.map(account => account.email)).size).toBe(17);
  });
  it('assigns the requested assessor account', () => {
    expect(DEV_ACCOUNTS.find(account => account.email === 'dev.asses@educloud.test')?.role).toBe('assessor');
  });
  it('assigns the requested awarding body account', () => {
    expect(DEV_ACCOUNTS.find(account => account.email === 'dev.eqa@educloud.test')?.role).toBe('awarding_body_eqa');
  });
  it('assigns the requested welfare account', () => {
    expect(DEV_ACCOUNTS.find(account => account.email === 'dev.welf@educloud.test')?.role).toBe('welfare_officer');
  });
});
describe('staging-only test-account provisioning safety',()=>{
 it('retires the privileged shared-password seed endpoint',()=>{
  const source=readFileSync('supabase/functions/seed-dev-users/index.ts','utf8');
  expect(source).toContain('Legacy shared-password test account seeding is disabled.');
  expect(source).toContain("code:'UNIPATHWAY_STAGING_CLI_ONLY'");
  expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  expect(source).not.toContain('admin.auth.admin.createUser');
  expect(source).not.toContain('DEV_ACCOUNT_PASSWORD');
 });
 it('preserves existing test account names in the new safer staging CLI',()=>{
  const script=readFileSync('scripts/bootstrap-unipathway-staging-accounts.mjs','utf8');
  for(const account of DEV_ACCOUNTS)expect(script).toContain(account.email);
  expect(script).toContain("getCredentials(env)");
  expect(script).toContain('fixture_namespace');
  expect(script).not.toContain('admin.auth.admin.updateUserById');
 });
});
