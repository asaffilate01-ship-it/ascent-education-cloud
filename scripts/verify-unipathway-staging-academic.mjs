/**
 * UniPathway academic / LMS staging acceptance.
 * Read-only. Uses actual Supabase Auth sessions, REST/RLS and private Storage.
 * Requires manually seeded non-production people, two tenants and object IDs.
 * Refuses production, the ambiguous repository ref and absent fixtures.
 * No credentials, personal evidence, or student results are printed.
 */
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const EXPECTED={
 superadmin:['superadmin','dev.superadmin@educloud.test'],
 director:['centre_director','dev.director@educloud.test'],
 admissions:['admissions_admin','dev.admissions@educloud.test'],
 lecturer:['lecturer','dev.lecturer@educloud.test'],
 programme:['programme_leader','dev.programme@educloud.test'],
 qa:['iqa_officer','dev.qa@educloud.test'],
 exams:['exams_officer','dev.exams@educloud.test'],
 finance:['finance_officer','dev.finance@educloud.test'],
 marketing:['marketing_officer','dev.marketing@educloud.test'],
 agent:['agent','dev.agent@educloud.test'],
 student:['student','dev.student@educloud.test'],
 unipartner:['university_partner','dev.unipartner@educloud.test'],
 employer:['employer_partner','dev.employer@educloud.test'],
 assessor:['assessor','dev.asses@educloud.test'],
 eqa:['awarding_body_eqa','dev.eqa@educloud.test'],
 welfare:['welfare_officer','dev.welf@educloud.test'],
 parent:['parent_guardian','dev.parent@educloud.test']
};
const mustEnv=(key)=>{
 const value=process.env[key];
 if(!value)throw Error('Missing protected staging environment configuration: '+key);
 return value;
};
const acknowledge=mustEnv('STAGING_RUN_ACK');
if(acknowledge!=='UNIPATHWAY_STAGING_ONLY')throw Error('Invalid staging acknowledgement');
const ref=mustEnv('STAGING_PROJECT_REF').trim().toLowerCase();
const address=mustEnv('STAGING_SUPABASE_URL');
const anonKey=mustEnv('STAGING_SUPABASE_ANON_KEY');
const productionRef=mustEnv('UNIPATHWAY_PRODUCTION_PROJECT_REF').trim().toLowerCase();
if(!/^[a-z0-9]{20}$/.test(ref) || !/^[a-z0-9]{20}$/.test(productionRef))throw Error('Invalid Supabase project reference');
if(ref===productionRef || ref==='sthrhcmjypwuorlbscfw')throw Error('Staging project must differ from production and unchecked repository configuration');
const parsed=new URL(address);
if(parsed.protocol!=='https:'||parsed.hostname!==ref+'.supabase.co'||parsed.pathname!=='/')
 throw Error('Staging URL does not match the explicitly approved project reference');
let fixture;
try{fixture=JSON.parse(mustEnv('STAGING_ACADEMIC_FIXTURES_JSON'));}catch{throw Error('Invalid staging academic fixtures JSON');}
const {tenants,accounts,objects}=fixture||{};
assert(tenants?.a&&tenants?.b&&tenants.a!==tenants.b,'Two different staging tenants are mandatory');
const requiredObjects=[
 'classA','classB','classRevokedA','boardA','boardB',
 'materialA','materialB','materialUnpublishedA','storagePathA','storagePathB',
 'studentAttemptA','studentAttemptB','studentAIRecommendationA','studentHumanMarkA',
 'studentReleasedAttemptA','studentReleasedAttemptB','unreleasedAttemptA',
 'labTaskA','labTaskB'
];
for(const name of requiredObjects)assert(objects?.[name], 'Missing seeded academic resource ID: '+name);
for(const [name,[role,email]] of Object.entries(EXPECTED)){
 const person=accounts?.[name];
 assert(person&&person.id&&person.password&&person.email&&person.tenantId!==undefined,
  'Missing required non-production account: '+name);
 assert.equal(person.email.toLowerCase(),email,'Unexpected test identity for '+name);
 assert.equal(person.role,role,'Incorrect expected role for '+name);
 if(name!=='superadmin')assert.equal(person.tenantId,tenants.a, 'Centre A role misconfigured: '+name);
}
for(const name of ['studentB','uninvitedStudentA']){
 const person=accounts?.[name];
 assert(person&&person.id&&person.email&&person.password&&person.role==='student'&&person.tenantId,
  'Missing isolation test learner: '+name);
 assert.equal(person.tenantId,name==='studentB'?tenants.b:tenants.a);
}
const tokens=new Map();
let checks=0;
function makeClient(){
 return createClient(address,anonKey,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{headers:{'x-unipathway-acceptance':'academic-staging-read-only'}}
 });
}
async function connect(name){
 const user=accounts[name],client=makeClient();
 const {data,error}=await client.auth.signInWithPassword({email:user.email,password:user.password});
 if(error||data.user?.id!==user.id)throw Error('Staging login does not match fixture: '+name);
 tokens.set(name,client);
 const roles=await client.from('user_roles').select('role,tenant_id').eq('user_id',user.id);
 if(roles.error)throw Error('RLS user role lookup failed for '+name);
 const matches=(roles.data||[]).filter(r=>r.role===user.role);
 assert.equal(matches.length,1,'Missing verified role assignment: '+name);
 // A non-superadmin identity cannot silently gain extra privilege in a test.
 assert.equal((roles.data||[]).length,1,'Multiple privileges on single-purpose test role: '+name);
 if(name==='superadmin'){
  assert.equal(matches[0].tenant_id,null,'Test superadmin role should be global');
 }else assert.equal(matches[0].tenant_id,user.tenantId,'Role tenant mismatch: '+name);
 const profile=await client.from('profiles').select('tenant_id').eq('user_id',user.id).maybeSingle();
 if(profile.error||!profile.data)throw Error('Profile tenant lookup failed: '+name);
 if(name!=='superadmin')assert.equal(profile.data.tenant_id,user.tenantId,'Profile role tenant mismatch: '+name);
 checks+=3;
 return client;
}
async function checkVisible(client,table,column,id,allow,label){
 const {data,error}=await client.from(table).select(column).eq(column,id).maybeSingle();
 if(error){
  // Missing tables, unknown policies and 404s are NOT evidence of access denial.
  if(!allow&&error.code==='42501'){checks++;return;}
  throw Error('RLS resource lookup failed: '+label+' ('+error.code+')');
 }
 assert.equal(data?.[column]===id,allow,(allow?'Expected authorised ':'Exposed forbidden ')+label);
 checks++;
}
async function readTable(client,table,column,id,allow,label){return checkVisible(client,table,column,id,allow,label);}
async function checkSigned(client,path,allow,label){
 const {data,error}=await client.storage.from('unipathway-module-materials').createSignedUrl(path,30);
 if(allow)assert(data?.signedUrl&&!error,'Approved student could not open private material '+label);
 else assert(!data?.signedUrl,'Unauthorised signed URL issued for '+label);
 checks++;
}
try{
 // Auth logins run sequentially to avoid rate-limiting 19 simultaneous sign-ins.
 for(const name of [...Object.keys(EXPECTED),'studentB','uninvitedStudentA'])await connect(name);
 const a=tokens.get('student'),b=tokens.get('studentB'),peer=tokens.get('uninvitedStudentA');
 const lecturer=tokens.get('lecturer'),marker=tokens.get('assessor'),qa=tokens.get('qa');
 const programme=tokens.get('programme'),director=tokens.get('director');
 const partner=tokens.get('unipartner'),employer=tokens.get('employer'),parent=tokens.get('parent');
 const o=objects;
 // Class invitation + tenant checks; revoked invitation and same-tenant observer denied.
 await readTable(a,'live_class_sessions','id',o.classA,true,'student A invited class');
 await readTable(b,'live_class_sessions','id',o.classA,false,'other tenant class');
 await readTable(peer,'live_class_sessions','id',o.classA,false,'same-tenant student without invite');
 await readTable(a,'live_class_sessions','id',o.classRevokedA,false,'revoked class');
 await readTable(lecturer,'live_class_sessions','id',o.classA,true,'allocated teaching staff classroom');
 await readTable(b,'live_class_sessions','id',o.classB,true,'tenant B class');
 await readTable(a,'lesson_whiteboards','id',o.boardA,true,'invited whiteboard');
 await readTable(peer,'lesson_whiteboards','id',o.boardA,false,'uninvited whiteboard');
 await readTable(b,'lesson_whiteboards','id',o.boardA,false,'other-tenant whiteboard');
 await readTable(b,'lesson_whiteboards','id',o.boardB,true,'other class own board');
 // Released and unpublished module metadata and private file URLs.
 await readTable(a,'unipathway_module_materials','id',o.materialA,true,'enrolled published notes');
 await readTable(peer,'unipathway_module_materials','id',o.materialA,false,'unenrolled learner notes');
 await readTable(a,'unipathway_module_materials','id',o.materialUnpublishedA,false,'private lecturer draft');
 await readTable(a,'unipathway_module_materials','id',o.materialB,false,'other tenant notes');
 await checkSigned(a,o.storagePathA,true,'own private notes');
 await checkSigned(peer,o.storagePathA,false,'same tenant unenrolled notes');
 await checkSigned(b,o.storagePathA,false,'other tenant notes');
 await checkSigned(b,o.storagePathB,true,'student B own notes');
 // Source submission, AI analysis and provisional marks are distinct.
 await readTable(a,'unipathway_assessment_attempts','id',o.studentAttemptA,true,'own submitted work');
 await readTable(b,'unipathway_assessment_attempts','id',o.studentAttemptA,false,'other tenant submitted work');
 await readTable(lecturer,'unipathway_assessment_attempts','id',o.studentAttemptA,false,'teaching lecturer accessing marking evidence');
 await readTable(marker,'unipathway_assessment_attempts','id',o.studentAttemptA,true,'assigned independent marker');
 await readTable(qa,'unipathway_assessment_attempts','id',o.studentAttemptA,true,'assigned IQA');
 await readTable(programme,'unipathway_assessment_attempts','id',o.studentAttemptA,true,'programme management assessment');
 await readTable(marker,'unipathway_assessment_attempts','id',o.studentAttemptB,false,'unrelated tenant marker');
 await readTable(b,'unipathway_assessment_attempts','id',o.studentAttemptB,true,'B own evidence');
 await readTable(a,'unipathway_assessment_ai_drafts','id',o.studentAIRecommendationA,false,'private AI assessment');
 await readTable(marker,'unipathway_assessment_ai_drafts','id',o.studentAIRecommendationA,true,'marker AI advisory');
 await readTable(a,'unipathway_assessment_human_marks','attempt_id',o.studentHumanMarkA,false,'unreleased provisional mark');
 await readTable(marker,'unipathway_assessment_human_marks','attempt_id',o.studentHumanMarkA,true,'human marker rubric score');
 await readTable(a,'unipathway_assessment_released_results','attempt_id',o.studentReleasedAttemptA,true,'approved result');
 await readTable(a,'unipathway_assessment_released_results','attempt_id',o.studentReleasedAttemptB,false,'other student result');
 await readTable(b,'unipathway_assessment_released_results','attempt_id',o.studentReleasedAttemptB,true,'student B result');
 await readTable(a,'unipathway_assessment_released_results','attempt_id',o.unreleasedAttemptA,false,'provisional unpublished result');
 await readTable(partner,'unipathway_assessment_attempts','id',o.studentAttemptA,false,'unassigned university partner coursework');
 await readTable(employer,'unipathway_assessment_attempts','id',o.studentAttemptA,false,'unassigned employer partner coursework');
 await readTable(parent,'unipathway_assessment_attempts','id',o.studentAttemptA,false,'unapproved parental coursework');
 await readTable(director,'unipathway_assessment_released_results','attempt_id',o.studentReleasedAttemptA,true,'centre director released result');
 // Coding lab evidence belongs only to the student and allocated module educator.
 await readTable(a,'unipathway_lab_code_workspaces','task_id',o.labTaskA,true,'own saved coding exercise');
 await readTable(b,'unipathway_lab_code_workspaces','task_id',o.labTaskA,false,'other tenant coding work');
 await readTable(peer,'unipathway_lab_code_workspaces','task_id',o.labTaskA,false,'unenrolled learner coding work');
 await readTable(b,'unipathway_lab_code_workspaces','task_id',o.labTaskB,true,'B saved coding exercise');
 await readTable(lecturer,'unipathway_lab_code_workspaces','task_id',o.labTaskA,true,'lecturer assigned practice review');
 console.log('PASS: '+Object.keys(EXPECTED).length+' named UniPathway roles + 2 isolation learners, '+checks+' read-only Auth/RLS/Storage assertions.');
 console.log('No production state, credentials, coursework text or student grades were printed or modified.');
}finally{
 await Promise.all([...tokens.values()].map(c=>c.auth.signOut().catch(()=>{})));
}
