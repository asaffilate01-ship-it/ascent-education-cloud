import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001', OTHER='10000000-0000-0000-0000-000000000002';
const STAFF='20000000-0000-0000-0000-000000000001', STUDENT='20000000-0000-0000-0000-000000000002';
const UNVERIFIED='20000000-0000-0000-0000-000000000003', OUTSIDER='20000000-0000-0000-0000-000000000004';
const LEAD='30000000-0000-0000-0000-000000000001',OTHER_LEAD='30000000-0000-0000-0000-000000000002';
const INTERNAL_LEAD='30000000-0000-0000-0000-000000000003';
let checks=0;
await db.exec([
'CREATE ROLE authenticated;',
'CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;',
'CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);',
"CREATE TYPE public.app_role AS ENUM('student','admissions_admin','centre_director','superadmin');",
'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
'CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);',
'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
'CREATE TABLE public.applications(id uuid PRIMARY KEY,tenant_id uuid, email text,source text,user_id uuid);',
'GRANT SELECT,UPDATE ON public.applications TO authenticated;',
'CREATE TABLE public.student_enrolments(student_id uuid,tenant_id uuid,status text);',
'GRANT INSERT ON public.student_enrolments TO authenticated;',
"CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
"CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
"CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u AND ur.tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND ur.role=r) $$;"
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017201000_international_service_activation.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,OTHER]);
await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now()),($3,$4,now()),($5,$6,NULL),($7,$8,now())',
[STAFF,'staff@example.com',STUDENT,'student@example.com',UNVERIFIED,'unverified@example.com',OUTSIDER,'outsider@example.com']);
await db.query('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2),($3,$2),($4,$2),($5,$6)',
[STAFF,T,STUDENT,UNVERIFIED,OUTSIDER,OTHER]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,$2,'student'),($4,$2,'student'),($5,$6,'student')",
[STAFF,T,STUDENT,UNVERIFIED,OUTSIDER,OTHER]);
await db.query("INSERT INTO public.applications(id,tenant_id,email,source) VALUES($1,$2,'student@example.com','ielts_preparation'),($3,$4,'outsider@example.com','university_progression_uk'),($5,$2,'student@example.com','university_progression_canada')",
[LEAD,T,OTHER_LEAD,OTHER,INTERNAL_LEAD]);
async function as(uid,tenant,fn){
 await db.exec('SET ROLE authenticated;');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await fn();}finally{await db.exec('RESET ROLE;');}
}
async function denied(fn){await assert.rejects(fn);checks++;}
await as(STUDENT,T,async()=>{
 await denied(()=>db.query('SELECT public.activate_international_service_from_lead($1,$2)',[LEAD,STUDENT]));
 const invisible=await db.query('SELECT id FROM public.international_service_enrolments');
 assert.equal(invisible.rows.length,0);checks++;
});
await as(STAFF,T,async()=>{
 await denied(()=>db.query('SELECT public.activate_international_service_from_lead($1,$2)',[OTHER_LEAD,OUTSIDER]));
 await denied(()=>db.query('SELECT public.activate_international_service_from_lead($1,$2)',[LEAD,UNVERIFIED]));
 await denied(()=>db.query('SELECT public.activate_international_service_from_lead($1,$2)',[LEAD,OUTSIDER]));
 const activation=await db.query('SELECT public.activate_international_service_from_lead($1,$2) AS id',[LEAD,STUDENT]);
 assert.ok(activation.rows[0].id);checks++;
 const same=await db.query('SELECT public.activate_international_service_from_lead($1,$2) AS id',[LEAD,STUDENT]);
 assert.equal(same.rows[0].id,activation.rows[0].id);checks++;
 const linked=await db.query('SELECT student_id,service_type,billing_mode,assigned_by FROM public.international_service_enrolments WHERE enquiry_id=$1',[LEAD]);
 assert.deepEqual([linked.rows[0].student_id,linked.rows[0].service_type,linked.rows[0].billing_mode,linked.rows[0].assigned_by],
 [STUDENT,'ielts_preparation','complimentary',STAFF]);checks++;
 const lead=await db.query('SELECT user_id FROM public.applications WHERE id=$1',[LEAD]);
 assert.equal(lead.rows[0].user_id,STUDENT);checks++;
 await db.query("INSERT INTO public.student_enrolments(student_id,tenant_id,status) VALUES($1,$2,'active')",[STUDENT,T]);
 const next=await db.query('SELECT public.activate_international_service_from_lead($1,$2,$3) AS id',[INTERNAL_LEAD,STUDENT,'included']);
 assert.ok(next.rows[0].id);checks++;
 const internal=await db.query('SELECT billing_mode,service_type FROM public.international_service_enrolments WHERE id=$1',[next.rows[0].id]);
 assert.equal(internal.rows[0].billing_mode,'included');
 assert.equal(internal.rows[0].service_type,'university_counselling');checks++;
 await denied(()=>db.query("UPDATE public.international_service_enrolments SET student_id=$1 WHERE id=$2",[OUTSIDER,next.rows[0].id]));
 const paused=await db.query("UPDATE public.international_service_enrolments SET status='paused' WHERE id=$1 RETURNING id",[next.rows[0].id]);
 assert.equal(paused.rows.length,1);checks++;
});
await as(STUDENT,T,async()=>{
 const rows=await db.query('SELECT enquiry_id,status FROM public.international_service_enrolments');
 assert.equal(rows.rows.length,2);checks++;
 const attempted=await db.query("UPDATE public.international_service_enrolments SET status='completed' RETURNING id");
 assert.equal(attempted.rows.length,0);checks++;
});
await as(OUTSIDER,OTHER,async()=>{
 const rows=await db.query('SELECT id FROM public.international_service_enrolments');
 assert.equal(rows.rows.length,0);checks++;
});
await db.close();
console.log('Verified international student service activation tests passed ('+checks+' checks).');
