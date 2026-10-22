import assert from 'node:assert/strict';
// Runs only in the disposable offline database after the complete schema replay.
export async function verifyFreshSchema(db){
 const count=await db.query('select count(*)::int n from auth.users');
 assert.equal(count.rows[0].n,0,'Fresh baseline must not provision historical identities');
 await db.exec(`BEGIN;
 INSERT INTO public.tenants(id,name,slug) VALUES('10000000-0000-4000-8000-000000000001','Offline QA','unipathway');
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('10000000-0000-4000-8000-000000000002','offline@example.invalid','{"role":"superadmin"}');
 UPDATE public.profiles SET tenant_id='10000000-0000-4000-8000-000000000001' WHERE user_id='10000000-0000-4000-8000-000000000002';
 INSERT INTO public.user_roles(user_id,role,tenant_id) VALUES('10000000-0000-4000-8000-000000000002','centre_director','10000000-0000-4000-8000-000000000001');
 INSERT INTO public.live_class_sessions(id,tenant_id,title,organiser_user_id,starts_at,ends_at) VALUES('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Offline class','10000000-0000-4000-8000-000000000002',now(),now()+interval '1 hour');
 INSERT INTO public.lesson_whiteboards(id,tenant_id,session_id,title) VALUES('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Offline board');
 SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 SET LOCAL ROLE authenticated;`);
 const append=operation=>db.query('select * from public.append_unipathway_whiteboard_operation($1,$2::jsonb)',['10000000-0000-4000-8000-000000000004',JSON.stringify(operation)]);
 await db.query('select public.ensure_my_account()');
 await db.query('select public.ensure_my_account()');
 await db.exec('RESET ROLE');
 const roles=await db.query("select role,count(*)::int n from public.user_roles where user_id='10000000-0000-4000-8000-000000000002' group by role");
 assert.equal(roles.rows.find(x=>x.role==='student')?.n,1,'Account repair must not duplicate default role');
 assert.equal(roles.rows.some(x=>x.role==='superadmin'),false,'User metadata must not elevate signup');
 await db.exec('SET LOCAL ROLE authenticated');
 let checks=3;
 const reject=async(operation,pattern)=>{
  await db.exec('SAVEPOINT invalid_operation');
  await assert.rejects(()=>append(operation),pattern);
  await db.exec('ROLLBACK TO SAVEPOINT invalid_operation');checks++;
 };
 const stroke={type:'stroke',points:[[1,1],[2,2]],width:2,color:'#123456'};
 await reject({...stroke,points:null},/Stroke points required/);
 await reject({...stroke,color:null},/Invalid stroke colour/);
 await reject({...stroke,color:'#123456junk'},/Invalid stroke colour/);
 await reject({type:'text',text:'',x:1,y:1,color:'#123456'},/Invalid text annotation/);
 await reject({...stroke,points:[[1,1],[2,564]]},/outside canvas/);
 const valid=await append(stroke);assert.equal(Number(valid.rows[0].sequence),1);checks++;
 const text=await append({type:'text',text:'Lesson note',x:20,y:30,color:'#abcdef'});assert.equal(Number(text.rows[0].sequence),2);checks++;
 await db.exec("SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',true)");
 await reject(stroke,/permission required/);
 await db.exec('ROLLBACK');
 console.log(JSON.stringify({fullSchemaChecks:checks,status:'passed',scope:'Offline identity trigger and whiteboard RPC validation; no Realtime transport acceptance'}));
}
