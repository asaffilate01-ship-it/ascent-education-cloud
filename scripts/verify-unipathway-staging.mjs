/**
 * Read-only acceptance checks against an explicitly approved, isolated
 * UniPathway staging Supabase database. NEVER run this against production.
 *
 * Configure STAGING_RUN_ACK, STAGING_PROJECT_REF, STAGING_SUPABASE_URL,
 * STAGING_SUPABASE_ANON_KEY and STAGING_FIXTURES_JSON as GitHub Actions
 * protected environment values before manually running the workflow.
 *
 * The fixtures must have real, pre-created two-tenant users and records.
 * This script never creates or changes database rows.
 */
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

function required(name){
 const value=process.env[name];
 if(!value)throw new Error('Missing required protected staging configuration: '+name);
 return value;
}
if(required('STAGING_RUN_ACK')!=='UNIPATHWAY_STAGING_ONLY')
 throw new Error('Staging-only acknowledgement missing; refusing to touch any database.');

const ref=required('STAGING_PROJECT_REF').trim().toLowerCase();
const url=required('STAGING_SUPABASE_URL');
const anonKey=required('STAGING_SUPABASE_ANON_KEY');
if(!/^[a-z0-9]{20}$/.test(ref))throw new Error('Expected a standard Supabase staging project reference.');
const host=new URL(url).hostname;
if(new URL(url).protocol!=='https:'||host!==ref+'.supabase.co')
 throw new Error('Configured staging URL does not match the explicitly approved project reference.');
// The checked-in supabase/config.toml reference has NOT been confirmed as staging.
// Intentionally never allow the ambiguous reference to pass a release gate.
if(ref==='sthrhcmjypwuorlbscfw')
 throw new Error('The repository config project is not independently verified as staging; refusing access.');
let fixtures;
try{fixtures=JSON.parse(required('STAGING_FIXTURES_JSON'));}catch{
 throw new Error('STAGING_FIXTURES_JSON must be a valid JSON staging fixture object.');
}
const names=['tenantA','tenantB','studentA','studentB','tutorA','planA','planB',
 'audioA','audioB','audioPathA','audioPathB','academicA','academicB'];
for(const name of names)if(!fixtures?.[name])
 throw new Error('Missing staging test fixture: '+name);
for(const name of ['studentA','studentB','tutorA']){
 for(const key of ['email','password','id'])if(!fixtures[name]?.[key])
  throw new Error('Missing staging test login '+name+'.'+key);
}
assert.notEqual(fixtures.tenantA,fixtures.tenantB,'Fixture tenants must differ.');
assert.notEqual(fixtures.studentA.id,fixtures.studentB.id,'Fixture student accounts must differ.');

function client(){
 return createClient(url,anonKey,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{'x-unipathway-acceptance':'staging-read-only'}}
 });
}
async function login(description,user){
 const c=client();
 const {data,error}=await c.auth.signInWithPassword({email:user.email,password:user.password});
 if(error||data.user?.id!==user.id)throw new Error('Fixture login failed for '+description+'. Check the protected environment.');
 return c;
}
async function selectId(c,table,id,visible,label){
 const {data,error}=await c.from(table).select('id').eq('id',id).maybeSingle();
 if(visible){
  if(error||data?.id!==id)throw new Error('FAIL expected own '+label+' to be accessible');
 }else if(data?.id===id){
  throw new Error('SECURITY FAIL foreign/private '+label+' was visible');
 }else if(error && error.code!=='42501' && error.code!=='PGRST301'){
  // RLS normally hides rows with an empty result; a table/endpoint error
  // cannot be silently interpreted as a successful access-control test.
  throw new Error('Cannot verify denied '+label+': endpoint returned an error');
 }
}
async function signedAudio(c,path,shouldSucceed,label){
 const result=await c.storage.from('ielts-speaking').createSignedUrl(path,30);
 if(shouldSucceed&&(!result.data?.signedUrl||result.error))
  throw new Error('FAIL approved '+label+' playback could not be signed');
 if(!shouldSucceed&&result.data?.signedUrl)
  throw new Error('SECURITY FAIL a foreign '+label+' received a signed audio URL');
}

const anon=client();
const a=await login('studentA',fixtures.studentA);
const b=await login('studentB',fixtures.studentB);
const tutor=await login('tutorA',fixtures.tutorA);
await selectId(anon,'ielts_study_plans',fixtures.planA,false,'anonymous IELTS plan');
await selectId(anon,'ielts_speaking_recordings',fixtures.audioA,false,'anonymous audio metadata');

await selectId(a,'ielts_study_plans',fixtures.planA,true,'student A IELTS plan');
await selectId(a,'ielts_study_plans',fixtures.planB,false,'student A accessing B plan');
await selectId(b,'ielts_study_plans',fixtures.planB,true,'student B IELTS plan');
await selectId(b,'ielts_study_plans',fixtures.planA,false,'student B accessing A plan');

await selectId(a,'ielts_speaking_recordings',fixtures.audioA,true,'student A speaking evidence');
await selectId(a,'ielts_speaking_recordings',fixtures.audioB,false,'student A accessing B evidence');
await selectId(b,'ielts_speaking_recordings',fixtures.audioB,true,'student B speaking evidence');
await selectId(b,'ielts_speaking_recordings',fixtures.audioA,false,'student B accessing A evidence');
await selectId(tutor,'ielts_speaking_recordings',fixtures.audioA,true,'same-centre tutor speaking evidence');
await selectId(tutor,'ielts_speaking_recordings',fixtures.audioB,false,'foreign-centre tutor speaking evidence');

await selectId(a,'academic_progression_evidence',fixtures.academicA,true,'student A reviewed progression');
await selectId(a,'academic_progression_evidence',fixtures.academicB,false,'student A foreign progression');
await selectId(b,'academic_progression_evidence',fixtures.academicB,true,'student B reviewed progression');

await signedAudio(a,fixtures.audioPathA,true,'student A private audio');
await signedAudio(a,fixtures.audioPathB,false,'student A foreign audio');
await signedAudio(tutor,fixtures.audioPathA,true,'tutor A centre audio');
await signedAudio(tutor,fixtures.audioPathB,false,'tutor A foreign audio');
await anon.auth.signOut();await a.auth.signOut();await b.auth.signOut();await tutor.auth.signOut();
console.log('PASS: read-only staging acceptance: anonymous access denied, two-tenant RLS and private audio.');
console.log('No migrations, enrolments, invoices, offers or production data were changed.');
