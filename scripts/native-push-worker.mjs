// Server only. Run once per minute using a supervised scheduler; never bundle in the app.
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createPushProviders} from './lib/native-push-providers.mjs';
import {validateWorkerConfig} from './lib/worker-config.mjs';
const env=process.env;
validateWorkerConfig('push', env);
if(env.NATIVE_PUSH_ENABLED!=='true')throw new Error('Native push is disabled');
if(!/^https:\/\//.test(env.SUPABASE_URL||'')||!env.SUPABASE_SERVICE_ROLE_KEY||!/^[-a-f0-9]{36}$/i.test(env.UNIPATHWAY_TENANT_ID||''))throw new Error('Server Supabase and tenant configuration required');
const fcmAccount=env.GOOGLE_APPLICATION_CREDENTIALS?JSON.parse(await readFile(env.GOOGLE_APPLICATION_CREDENTIALS,'utf8')):null;
const apnsKey=env.APNS_KEY_FILE?await readFile(env.APNS_KEY_FILE,'utf8'):null;
if(!fcmAccount&&!apnsKey)throw new Error('At least one push provider must be configured');
if(apnsKey&&(!env.APNS_KEY_ID||!env.APNS_TEAM_ID))throw new Error('APNs key ID and team ID required');
const platforms=[...(fcmAccount?['android']:[]),...(apnsKey?['ios']:[])];
const send=createPushProviders({fcmAccount,apnsKey,apnsKeyId:env.APNS_KEY_ID,apnsTeamId:env.APNS_TEAM_ID,apnsEnvironment:env.APNS_ENVIRONMENT||'production'});
const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw new Error(`Push database operation failed: ${name}`);return r.data;}
let accepted=0,retry=0,suppressed=0;
for(let i=0;i<20;i++){
 const job=await rpc('claim_unipathway_push',{p_tenant:env.UNIPATHWAY_TENANT_ID,p_platform:platforms[i%platforms.length]});if(!job)continue;
 const device=await rpc('authorise_unipathway_push',{p_id:job.id,p_lease:job.lease});if(!device){suppressed++;continue;}
 let result='retry';try{result=await send(device);}catch{/* Keep errors, tokens and provider credentials out of logs. */}
 await rpc('finish_unipathway_push',{p_id:job.id,p_lease:job.lease,p_status:result});
 if(result==='accepted')accepted++;else if(result==='retry')retry++;else suppressed++;
}
console.log(JSON.stringify({accepted,retry,suppressed,note:'Provider acceptance does not prove device receipt'}));
