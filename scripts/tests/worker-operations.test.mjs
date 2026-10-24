import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {validateWorkerConfig} from '../lib/worker-config.mjs';
const uuid = '11111111-2222-3333-4444-555555555555';
const base = {SUPABASE_URL:'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-secret', UNIPATHWAY_TENANT_ID:uuid};
const recordings = {...base, MS_TENANT_ID:uuid, MS_CLIENT_ID:uuid, MS_CLIENT_SECRET:'synthetic-microsoft-secret'};
const push = {...base, NATIVE_PUSH_ENABLED:'true', GOOGLE_APPLICATION_CREDENTIALS:'/nonexistent/credentials.json'};
test('valid recording configuration reports connectivity as untested', () => {
  assert.equal(validateWorkerConfig('recordings', recordings).providerConnectivity, 'not-tested');
});
test('rejects unsafe database origins without exposing their contents', () => {
  for (const url of ['http://example.invalid', 'https://user:password@example.invalid', 'https://example.invalid/path', 'https://example.invalid?key=secret', 'https://example.invalid#secret', 'https://example.invalid:444']) {
    assert.throws(() => validateWorkerConfig('recordings', {...recordings, SUPABASE_URL:url}), error => !error.message.includes(url) && error.message.includes('HTTPS origin'));
  }
});
test('rejects malformed tenant and missing Microsoft credentials', () => {
  assert.throws(() => validateWorkerConfig('recordings', {...recordings, UNIPATHWAY_TENANT_ID:'------------------------------------'}), /UUID/);
  assert.throws(() => validateWorkerConfig('recordings', {...recordings, MS_CLIENT_SECRET:''}), /MS_CLIENT_SECRET/);
});
test('push requires explicit enablement and a provider', () => {
  assert.throws(() => validateWorkerConfig('push', base), /NATIVE_PUSH_ENABLED.*provider/);
  assert.equal(validateWorkerConfig('push', push).configuration, 'valid');
});
test('invalid Apple configuration fails before any jobs are claimed', () => {
  assert.throws(() => validateWorkerConfig('push', {...push, APNS_KEY_FILE:'/key', APNS_KEY_ID:'bad', APNS_TEAM_ID:'bad', APNS_ENVIRONMENT:'preview'}), /APNS_KEY_ID.*APNS_TEAM_ID.*APNS_ENVIRONMENT/);
});
test('offline CLI exits successfully without contacting synthetic provider hosts', () => {
  const result = spawnSync(process.execPath, ['scripts/check-worker-config.mjs','recordings'], {env:recordings, encoding:'utf8', timeout:3000});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).providerConnectivity, 'not-tested');
});
test('offline CLI rejects missing credential files and redacts secret values and paths', () => {
  const result = spawnSync(process.execPath, ['scripts/check-worker-config.mjs','push'], {env:push, encoding:'utf8', timeout:3000});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FCM credential file is unreadable or invalid/);
  assert.ok(!result.stderr.includes(push.GOOGLE_APPLICATION_CREDENTIALS));
  assert.ok(!result.stderr.includes(base.SUPABASE_SERVICE_ROLE_KEY));
});
