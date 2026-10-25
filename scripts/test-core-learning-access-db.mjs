import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try {
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
CREATE DOMAIN public.app_role AS text;
CREATE TABLE user_roles(user_id uuid,tenant_id uuid,role public.app_role);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE TABLE profiles(user_id uuid primary key,tenant_id uuid,role text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT tenant_id FROM public.profiles WHERE user_id=u $$;
CREATE FUNCTION public.has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=u AND role=r) $$;
CREATE TABLE programmes(id uuid primary key,tenant_id uuid);
CREATE TABLE modules(id uuid primary key,tenant_id uuid,programme_id uuid,lecturer_id uuid);
CREATE TABLE student_enrolments(id uuid primary key,student_id uuid,programme_id uuid,tenant_id uuid,status text);
CREATE TABLE assignments(id uuid primary key,module_id uuid,tenant_id uuid,status text);
CREATE TABLE scheduled_lectures(id uuid primary key,module_id uuid,tenant_id uuid,lecturer_id uuid);
CREATE TABLE classroom_sessions(id uuid primary key,module_id uuid,tenant_id uuid,host_id uuid);
CREATE TABLE classroom_recordings(id uuid primary key,session_id uuid,tenant_id uuid,host_id uuid);
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;`);
// Fixtures: own course, another course in the same centre, and a foreign centre.
const roles=['superadmin','centre_director','programme_leader','admissions_admin','lecturer','student','agent','finance_officer','marketing_officer','security_officer','parent_guardian','assessor','iqa_officer','awarding_body_eqa','welfare_officer','exams_officer','employer_partner','university_partner'];
for(let i=0;i<roles.length;i++)await db.query('insert into profiles values($1,$2,$3)',[id(100+i),id(1),roles[i]]);
await db.query('insert into profiles values($1,$2,$3),($4,$5,$6)',[id(200),id(1),'lecturer',id(201),id(2),'student']);
for(let i=0;i<3;i++){
const t=id(i===2?2:1),m=id(20+i),p=id(10+i),teacher=id(i===0?104:200);
await db.query('insert into programmes values($1,$2)',[p,t]);await db.query('insert into modules values($1,$2,$3,$4)',[m,t,p,teacher]);
await db.query('insert into assignments values($1,$2,$3,$4)',[id(30+i),m,t,'active']);
await db.query('insert into scheduled_lectures(id,module_id,tenant_id,lecturer_id) values($1,$2,$3,$4)',[id(40+i),m,t,teacher]);
await db.query('insert into classroom_sessions values($1,$2,$3,$4)',[id(50+i),m,t,teacher]);
await db.query('insert into classroom_recordings values($1,$2,$3,$4)',[id(60+i),id(50+i),t,teacher]);}
await db.query("insert into student_enrolments values($1,$2,$3,$4,'active')",[id(70),id(105),id(10),id(1)]);
// Exercise the actual legacy scheduling RPC, not just direct table writes.
await db.exec(`ALTER TABLE scheduled_lectures ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE scheduled_lectures ADD COLUMN day_of_week smallint, ADD COLUMN start_time time, ADD COLUMN end_time time,
ADD COLUMN academic_year text, ADD COLUMN semester smallint, ADD COLUMN color text, ADD COLUMN is_active boolean DEFAULT true;`);
const legacy=readFileSync('supabase/migrations/20260317154315_94fbaf03-26d2-487b-809b-6a2c1e3208c3.sql','utf8');
await db.exec(legacy.slice(legacy.indexOf('CREATE OR REPLACE FUNCTION public.auto_schedule_module('),legacy.indexOf('-- Notify on new lecture schedule')));
await db.exec(readFileSync('supabase/migrations/20261025225129_core_learning_assignment_rls.sql','utf8'));
await db.exec('INSERT INTO user_roles SELECT user_id,tenant_id,role::public.app_role FROM profiles');
await db.exec(readFileSync('supabase/migrations/20261025232741_lecturer_assignment_directory.sql','utf8'));
async function actor(n,sql,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE')}}
assert.equal((await actor(102,'select count(*)::int n from user_roles')).rows[0].n,2);checks++;
assert.equal((await actor(105,'select count(*)::int n from user_roles')).rows[0].n,0);checks++;
for(let i=0;i<roles.length;i++)for(const table of ['modules','assignments','scheduled_lectures','classroom_sessions','classroom_recordings']){
const expected=i===0?3:[1,2].includes(i)?2:i===3?(table==='modules'?2:0):[4,5].includes(i)?1:0;
assert.equal((await actor(100+i,`select count(*)::int n from ${table}`)).rows[0].n,expected,roles[i]+' '+table);checks++;}
await assert.rejects(()=>actor(105,'insert into assignments values($1,$2,$3,$4)',[id(80),id(20),id(1),'active']));checks++;
await assert.rejects(()=>actor(104,'insert into assignments values($1,$2,$3,$4)',[id(80),id(21),id(1),'active']));checks++;
await actor(104,'insert into assignments values($1,$2,$3,$4)',[id(80),id(20),id(1),'draft']);checks++;
assert.equal((await actor(105,'select count(*)::int n from assignments')).rows[0].n,1);checks++;
await assert.rejects(()=>actor(104,'update assignments set module_id=$1 where id=$2',[id(21),id(80)]));checks++;
await assert.rejects(()=>actor(103,"insert into student_enrolments values($1,$2,$3,$4,'active')",[id(81),id(201),id(10),id(1)]));checks++;
await assert.rejects(()=>actor(101,'update modules set lecturer_id=$1 where id=$2',[id(105),id(20)]));checks++;
await assert.rejects(()=>actor(104,'insert into scheduled_lectures(id,module_id,tenant_id,lecturer_id) values($1,$2,$3,$4)',[id(82),id(20),id(1),id(200)]));checks++;
await assert.rejects(()=>actor(105,'select auto_schedule_module($1,$2,$3)',[id(20),id(104),id(1)]));checks++;
await assert.rejects(()=>actor(104,'select auto_schedule_module($1,$2,$3)',[id(21),id(200),id(1)]));checks++;
assert.equal((await actor(104,'select auto_schedule_module($1,$2,$3) result',[id(20),id(104),id(1)])).rows[0].result.slots_assigned,8);checks++;
assert.equal((await db.query("select prosecdef from pg_proc where proname='auto_schedule_module'")).rows[0].prosecdef,false);checks++;
await db.exec("update student_enrolments set status='withdrawn'");assert.equal((await actor(105,'select count(*)::int n from assignments')).rows[0].n,0);checks++;
await assert.rejects(()=>actor(105,'TRUNCATE assignments'));checks++;
await db.exec('SET ROLE anon');assert.equal((await db.query('select count(*)::int n from modules')).rows[0].n,0);checks++;
console.log(`Core learning RLS: ${checks} role, assignment, cross-course, cross-tenant, draft and withdrawal checks passed`);
} finally {await db.close();}
