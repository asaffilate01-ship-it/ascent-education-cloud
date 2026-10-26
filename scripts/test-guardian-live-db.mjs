import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {verifyTuition} from './lib/verify-unipathway-tuition.mjs';
const db=new PGlite();let checks=0;
const id=n=>`91000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=name=>readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(f=>f.endsWith(name)),'utf8');
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA unipathway_acl;CREATE DOMAIN app_role AS text;
CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
CREATE TABLE tenants(id uuid primary key,name text,slug text);
CREATE TABLE profiles(user_id uuid primary key,tenant_id uuid,full_name text);
CREATE TABLE user_roles(user_id uuid,tenant_id uuid,role app_role);
CREATE FUNCTION fixture_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO profiles VALUES(NEW.user_id,NEW.tenant_id,'Fixture learner') ON CONFLICT(user_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id;RETURN NEW;END $$;
CREATE TRIGGER fixture_profile AFTER INSERT ON user_roles FOR EACH ROW EXECUTE FUNCTION fixture_profile();
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
CREATE TABLE programmes(id uuid primary key,tenant_id uuid,title text,level text,awarding_body text);
CREATE TABLE modules(id uuid primary key,tenant_id uuid,programme_id uuid,lecturer_id uuid,title text);
CREATE TABLE student_enrolments(id uuid primary key default gen_random_uuid(),student_id uuid,programme_id uuid,tenant_id uuid,status text DEFAULT 'active');
CREATE TABLE parent_student_links(id uuid primary key DEFAULT gen_random_uuid(),parent_id uuid,student_id uuid,tenant_id uuid,verified boolean DEFAULT false,relationship text);
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_read ON parent_student_links FOR SELECT TO authenticated USING(parent_id=auth.uid());
CREATE TABLE attendance_records(id uuid primary key default gen_random_uuid(),tenant_id uuid,student_id uuid,module_id uuid,date date,status text);
CREATE TABLE scheduled_lectures(id uuid primary key default gen_random_uuid(),tenant_id uuid,module_id uuid,day_of_week int,start_time time,end_time time,is_active boolean default true,recurrence text default 'weekly',effective_from date,effective_until date,cohort_reference text);
GRANT USAGE ON SCHEMA public,auth,unipathway_acl TO authenticated,anon;
CREATE FUNCTION unipathway_acl.module_access(m_id uuid,t uuid,w boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.modules m WHERE m.id=m_id AND m.tenant_id=t AND t=public.get_user_tenant_id(auth.uid()) AND ((m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer')) OR (NOT w AND public.has_role(auth.uid(),'student') AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=auth.uid() AND e.tenant_id=t AND e.programme_id=m.programme_id AND e.status='active')))) $$;`);
await db.exec(migration('guardian_live_workflows.sql'));await db.exec(migration('tuition_live_workflows.sql'));
await verifyTuition(db);
for(const [u,t,r] of [[1,10,'parent_guardian'],[2,10,'student'],[3,10,'admissions_admin'],[4,10,'lecturer'],[5,10,'student'],[6,20,'parent_guardian'],[7,10,'lecturer'],[8,10,'agent']]){
 await db.query('insert into auth.users values($1,$2,now())',[id(u),`u${u}@example.invalid`]);await db.query('insert into user_roles values($1,$2,$3)',[id(u),id(t),r]);}
await db.exec(`INSERT INTO modules VALUES('${id(40)}','${id(10)}','${id(30)}','${id(4)}','Maths');INSERT INTO student_enrolments(student_id,programme_id,tenant_id) VALUES('${id(2)}','${id(30)}','${id(10)}');
INSERT INTO attendance_records(tenant_id,student_id,module_id,date,status) VALUES('${id(10)}','${id(2)}','${id(40)}',current_date,'present'),('${id(10)}','${id(5)}','${id(40)}',current_date,'absent');
INSERT INTO scheduled_lectures(tenant_id,module_id,day_of_week,start_time,end_time,effective_from) VALUES('${id(10)}','${id(40)}',extract(isodow FROM (now() AT TIME ZONE 'Asia/Karachi')),'09:00','10:00',current_date-10);`);
async function actor(n,q,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('SET ROLE authenticated');try{return await db.query(q,args)}finally{await db.exec('RESET ROLE')}}
const value=async(n,q,args=[])=>(await actor(n,q,args)).rows[0]?.value;
const denied=async(fn)=>{await assert.rejects(fn);checks++;};
await denied(()=>actor(1,'insert into parent_student_links(parent_id,student_id,tenant_id,verified) values($1,$2,$3,true)',[id(1),id(2),id(10)]));
await denied(()=>actor(1,'select verify_unipathway_guardian_link($1,$2,$3)',['u1@example.invalid','u2@example.invalid','Verified evidence ref']));
await denied(()=>actor(3,'select verify_unipathway_guardian_link($1,$2,$3)',['u6@example.invalid','u2@example.invalid','Verified evidence ref']));
await actor(3,'select verify_unipathway_guardian_link($1,$2,$3)',['u1@example.invalid','u2@example.invalid','Verified evidence ref']);checks++;
const link=(await db.query('select id from parent_student_links')).rows[0].id;
let activity=await value(1,'select get_unipathway_guardian_activity() value');assert.equal(activity[0].student_name,null);assert.equal(activity[0].attendance.length,0);checks+=2;
await denied(()=>actor(1,"select set_unipathway_guardian_scope($1,'attendance',true)",[link]));
await denied(()=>actor(5,"select set_unipathway_guardian_scope($1,'attendance',true)",[link]));
for(const scope of ['attendance','schedule','communication'])await actor(2,'select set_unipathway_guardian_scope($1,$2,true)',[link,scope]);
activity=await value(1,'select get_unipathway_guardian_activity() value');assert.equal(activity[0].attendance.length,1);assert.ok(activity[0].schedule.length>0);assert.ok(activity[0].schedule.every(s=>new Date(s.starts_at).getUTCHours()===4));checks+=3;
for(const n of [6,7,8]){assert.equal((await value(n,'select get_unipathway_guardian_activity() value')).length,0);checks++;}
const send=n=>value(n,'select send_unipathway_guardian_message_once($1,$2,$3) value',[link,'Please review the next lesson.',id(60)]);
const msg=await send(1);assert.equal(await send(1),msg);checks++;
await denied(()=>send(7));assert.equal((await actor(4,'select * from unipathway_guardian_messages')).rows.length,1);checks++;
await actor(2,"select set_unipathway_guardian_scope($1,'communication',false)",[link]);assert.equal((await actor(1,'select * from unipathway_guardian_messages')).rows.length,0);checks++;await denied(()=>send(1));
await db.exec("update scheduled_lectures set cohort_reference='Group B'");assert.equal((await value(1,'select get_unipathway_guardian_activity() value'))[0].schedule.length,0);checks++;
await actor(3,'select verify_unipathway_guardian_link($1,$2,$3)',['u1@example.invalid','u2@example.invalid','Reverified identity ref']);assert.equal((await value(1,'select get_unipathway_guardian_activity() value'))[0].attendance.length,0);checks++;
await denied(()=>actor(3,'update parent_student_links set student_id=$1 where id=$2',[id(5),link]));
await db.exec('SET ROLE anon');await denied(()=>db.query('select get_unipathway_guardian_activity()'));await db.exec('RESET ROLE');
console.log(`Legacy guardian activation: ${checks} role, consent, PKT schedule, retry and isolation checks passed`);
}finally{await db.close();}
