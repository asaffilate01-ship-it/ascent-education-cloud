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