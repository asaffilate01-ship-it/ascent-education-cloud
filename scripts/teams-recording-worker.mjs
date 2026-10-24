// Server-only Node 22+ worker. Never import this into the web application.
import {createClient} from '@supabase/supabase-js';
import {Upload} from 'tus-js-client';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {recordingId,belongsToSession,listRecordings} from './lib/teams-recordings.mjs';
const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','UNIPATHWAY_TENANT_ID','MS_TENANT_ID','MS_CLIENT_ID','MS_CLIENT_SECRET'];
for(const name of required)if(!process.env[name])throw new Error(`Missing server configuration: ${name}`);
const env=process.env;
for(const name of ['UNIPATHWAY_TENANT_ID','MS_TENANT_ID','MS_CLIENT_ID'])if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(env[name]))throw new Error(`Invalid ${name}`);
const url=new URL(env.SUPABASE_URL);
if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')throw new Error('Invalid Supabase URL');
const db=createClient(url.origin,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const check=result=>{if(result.error)throw new Error('database_operation_failed');return result.data;};
const rpc=async(name,args)=>check(await db.rpc(name,args));
const signal=AbortSignal.timeout(45*60*1000);
let token,tokenUntil=0;
async function graphFetch(path,json=true){
 if(Date.now()>tokenUntil){
  const response=await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',signal,redirect:'error',body:new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})});
  if(!response.ok)throw new Error(`microsoft_auth_${response.status}`);
  const value=await response.json();if(!value.access_token)throw new Error('microsoft_auth_missing_token');token=value.access_token;tokenUntil=Date.now()+Math.max(60,Number(value.expires_in||3600)-300)*1000;
 }
 const response=await fetch(path,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal});
 if(!response.ok)throw new Error(`graph_${response.status}`);
 return json?response.json():response;
}
async function upload(file,path,size){
 const storageHost=url.hostname.endsWith('.supabase.co')?`${url.hostname.replace('.supabase.co','.storage.supabase.co')}`:url.hostname;
 await new Promise((resolve,reject)=>{
  const stream=createReadStream(file);
  const transfer=new Upload(stream,{endpoint:`https://${storageHost}/storage/v1/upload/resumable`,uploadSize:size,
   chunkSize:6*1024*1024,retryDelays:[0,1000,3000,5000,10000],removeFingerprintOnSuccess:true,
   headers:{authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'x-upsert':'true'},
   metadata:{bucketName:'unipathway-class-media',objectName:path,contentType:'video/mp4',cacheControl:'0'},
   onError:()=>{cleanup();reject(new Error('storage_transfer_failed'));},onSuccess:()=>{cleanup();resolve();}});
  const abort=()=>{void transfer.abort();cleanup();reject(new Error('worker_timeout'));};
  const cleanup=()=>{signal.removeEventListener('abort',abort);stream.destroy();};
  if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});transfer.start();
 });
}
async function run(){
 // Optional schedule scan is bounded to the configured centre and the last seven days.
 if(process.argv.includes('--scan')){
  const sessions=check(await db.from('live_class_sessions').select('id').eq('tenant_id',env.UNIPATHWAY_TENANT_ID).eq('provider','microsoft_teams').eq('recording_enabled',true).not('status','in','(cancelled,deleted)').lt('ends_at',new Date(Date.now()-30*60000).toISOString()).gt('ends_at',new Date(Date.now()-7*86400000).toISOString()).limit(1000));
  if(sessions.length)check(await db.from('unipathway_recording_jobs').upsert(sessions.map(s=>({session_id:s.id})),{onConflict:'session_id',ignoreDuplicates:true}));
 }
 const claimed=await rpc('claim_unipathway_recording_job',{p_tenant:env.UNIPATHWAY_TENANT_ID});
 if(!claimed){console.log('No recording transfers queued.');return;}
 const {job,session,organiser}=claimed;let folder;
 try{
  if(session.tenant_id!==env.UNIPATHWAY_TENANT_ID||!organiser||session.provider!=='microsoft_teams'||['cancelled','deleted'].includes(session.status)||Date.parse(session.ends_at)>Date.now())throw new Error('invalid_organiser_or_session');
  const root=`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organiser)}/onlineMeetings`;
  const query=new URL(root);query.searchParams.set('$filter',`JoinWebUrl eq '${String(session.join_url).replaceAll("'","''")}'`);
  const meetings=await graphFetch(query.href);
  if(meetings.value?.length!==1)throw new Error('meeting_not_found_or_ambiguous');
  const meeting=meetings.value[0];
  if(meeting.participants?.organizer?.identity?.user?.id?.toLowerCase()!==organiser.toLowerCase())throw new Error('organiser_mismatch');
  // Never trust recordingContentUrl; construct the authenticated Graph path from IDs.
  const base=`${root}/${encodeURIComponent(meeting.id)}/recordings`;
  const all=await listRecordings(graphFetch,base);
  const recordings=all.filter(r=>belongsToSession(r,session,meeting.id));
  if(!recordings.length)throw new Error('recordings_not_ready_or_outside_lesson');
  folder=await mkdtemp(join(tmpdir(),'unipathway-recording-'));
  let count=0;
  for(const recording of recordings){
   const id=recordingId(session.id,meeting.id,recording.id);
   const existing=check(await db.from('live_class_artifacts').select('id').eq('id',id).maybeSingle());
   if(existing){count++;continue;}
   const content=await graphFetch(`${base}/${encodeURIComponent(recording.id)}/content`,false);
   if(!content.headers.get('content-type')?.toLowerCase().startsWith('video/mp4'))throw new Error('unexpected_recording_content');
   const maxBytes=2*1024*1024*1024;let bytes=0;
   const limiter=new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;callback(bytes>maxBytes?new Error('recording_exceeds_2gb'):null,chunk);}});
   const file=join(folder,`${id}.mp4`);
   await pipeline(Readable.fromWeb(content.body),limiter,createWriteStream(file,{mode:0o600}),{signal});
   const size=(await stat(file)).size;if(!size)throw new Error('empty_recording');
   const length=content.headers.get('content-length');if(length&&Number(length)!==size)throw new Error('incomplete_recording');
   const path=`${session.tenant_id}/${session.id}/${id}.mp4`;
   await upload(file,path,size);
   // Upload success precedes the draft record; retries cannot overwrite a released artifact.
   check(await db.from('live_class_artifacts').insert({id,tenant_id:session.tenant_id,session_id:session.id,artifact_type:'recording',provider_reference:recording.id,storage_reference:path,publication_status:'draft',metadata:{ingestion_status:'verified',bytes:size,meeting_id:meeting.id,recorded_at:recording.createdDateTime,ended_at:recording.endDateTime},available_at:null}));
   await rm(file);count++;
  }
  check(await db.from('unipathway_recording_jobs').update({status:'complete',result_count:count,finished_at:new Date().toISOString(),lease_until:null,error_code:null}).eq('session_id',session.id).eq('lease_id',job.lease_id));
  console.log(JSON.stringify({session:session.id,status:'complete',recordings:count}));
 }catch(error){
  // Persist only our fixed codes, never provider response bodies, tokens or signed URLs.
  const code=/^[a-z][a-z0-9_]{2,80}$/.test(error.message)?error.message:'transfer_failed';
  check(await db.from('unipathway_recording_jobs').update({status:'failed',error_code:code,finished_at:new Date().toISOString(),lease_until:null}).eq('session_id',session.id).eq('lease_id',job.lease_id));
  console.error(JSON.stringify({session:session.id,status:'failed',code}));process.exitCode=1;
 }finally{if(folder)await rm(folder,{recursive:true,force:true});}
}
await run();
