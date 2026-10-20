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
describe('staging-only test-account provisioning safety', () => {
 it('refuses production and unexpected Supabase projects',()=>{
  const source=readFileSync('supabase/functions/seed-dev-users/index.ts','utf8');
  expect(source).toContain("Deno.env.get('APP_ENV') !== 'staging'");
  expect(source).toContain("Deno.env.get('UNIPATHWAY_ISOLATED_STAGING_SEED') !== 'true'");
  expect(source).toContain("url !== Deno.env.get('UNIPATHWAY_STAGING_SUPABASE_URL')");
  expect(source).toContain("Demo account seeding is restricted to verified isolated staging.");
  expect(source).not.toContain('admin.auth.admin.updateUserById(existing.id');
 });
 it('reconciles existing staging accounts rather than skipping their tenant and role scope',()=>{
  const source=readFileSync('supabase/functions/seed-dev-users/index.ts','utf8');
  expect(source).not.toContain('if (createErr) {\n        results.push({ email: acc.email, ok: true });');
  expect(source).toContain(".from('profiles')");
  expect(source).toContain(".from('user_roles')");
 });
});
