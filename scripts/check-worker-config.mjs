import {readFile} from 'node:fs/promises';
import {createPrivateKey} from 'node:crypto';
import {validateWorkerConfig} from './lib/worker-config.mjs';
try {
  const kind = process.argv[2];
  const result = validateWorkerConfig(kind, process.env);
  if (kind === 'push') {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const account = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
        if (account.type !== 'service_account' || !account.client_email || !/^[-a-z0-9]+$/.test(account.project_id || '') || createPrivateKey(account.private_key).asymmetricKeyType !== 'rsa') throw Error();
      } catch { throw Error('FCM credential file is unreadable or invalid'); }
    }
    if (process.env.APNS_KEY_FILE) {
      try {
        const key = createPrivateKey(await readFile(process.env.APNS_KEY_FILE, 'utf8'));
        if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw Error();
      } catch { throw Error('APNs key file is unreadable or is not a P-256 private key'); }
    }
  }
  console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
