// Pure offline validation: never prints secrets or contacts a provider.
export function validateWorkerConfig(kind, env) {
  if (!['recordings', 'push'].includes(kind)) throw Error('Choose recordings or push');
  const errors = [];
  const required = name => { if (!env[name]?.trim()) errors.push(`${name} is required`); };
  required('SUPABASE_SERVICE_ROLE_KEY');
  try {
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port) throw Error();
  } catch { errors.push('SUPABASE_URL must be an HTTPS origin without credentials, port, query or fragment'); }
  const uuid = name => {
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(env[name] || '')) errors.push(`${name} must be a UUID`);
  };
  uuid('UNIPATHWAY_TENANT_ID');
  if (kind === 'recordings') {
    uuid('MS_TENANT_ID'); uuid('MS_CLIENT_ID'); required('MS_CLIENT_SECRET');
  } else {
    if (env.NATIVE_PUSH_ENABLED !== 'true') errors.push('NATIVE_PUSH_ENABLED must be true before running the worker');
    if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.APNS_KEY_FILE) errors.push('Configure at least one push provider');
    if (env.APNS_KEY_FILE) {
      for (const name of ['APNS_KEY_ID', 'APNS_TEAM_ID']) {
        if (!/^[A-Z0-9]{10}$/.test(env[name] || '')) errors.push(`${name} must contain 10 uppercase letters or digits`);
      }
      if (!['sandbox', 'production'].includes(env.APNS_ENVIRONMENT || 'production')) errors.push('APNS_ENVIRONMENT must be sandbox or production');
    }
  }
  if (errors.length) throw Error(errors.join('; '));
  return {kind, configuration: 'valid', providerConnectivity: 'not-tested'};
}
