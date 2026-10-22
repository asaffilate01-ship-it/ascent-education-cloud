import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Real Postgres RLS execution with two centre tenants and five distinct actors.
// This is a selected migration fixture, NOT a complete deployed Supabase replay.
const db=new PGlite();
let checks=0;
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const S1='11111111-1111-4111-8111-111111111111',S2='22222222-2222-4222-8222-222222222222';
const S3='33333333-3333-4333-8333-333333333333',L1='44444444-4444-4444-8444-444444444444';
const L2='55555555-5555-4555-8555-555555555555';
const P1='66666666-6666-4666-8666-666666666666',P2='77777777-7777-4777-8777-777777777777';
const M1='88888888-8888-4888-8888-888888888888',M2='99999999-9999-4999-8999-999999999999';
const T1='aaaaaaaa-0000-4000-8000-000000000001',T2='bbbbbbbb-0000-4000-8000-000000000002';
const ddl=[
 "CREATE ROLE anon; CREATE ROLE authenticated;",
 "CREATE SCHEMA auth;",
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','programme_leader','centre_director','superadmin');",
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.test_uid',true),'')::uuid $$;",
 "CREATE TABLE public.tenants(id uuid PRIMARY KEY);",
 "CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);",
 "CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);",
 "CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT tenant_id FROM public.profiles WHERE user_id=u LIMIT 1 $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r AND (tenant_id IS NULL OR tenant_id=public.get_user_tenant_id(u))) $$;",
 "CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid,title text);",
 "CREATE TABLE public.student_enrolments(id uuid DEFAULT gen_random_uuid(),tenant_id uuid,programme_id uuid,student_id uuid,status text);",
 "CREATE TABLE public.lab_templates(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,title text,provider text CHECK(provider IN('aws_academy','unipathway_container')),active boolean DEFAULT true,duration_minutes int DEFAULT 90,max_attempts int DEFAULT 2);",
 "CREATE TABLE public.lab_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,template_id uuid,sequence_no int,title text,instructions text,verification_type text DEFAULT 'manual',points numeric DEFAULT 0,verification_config jsonb DEFAULT '{}'::jsonb);",
 "CREATE TABLE public.lab_provider_configs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,provider text,enabled boolean DEFAULT false,credential_status text DEFAULT 'required',budget_monthly numeric);",
 "CREATE TABLE public.lab_class_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,template_id uuid,cohort_reference text NOT NULL,lead_instructor_id uuid NOT NULL,ta_user_ids uuid[] DEFAULT '{}',starts_at timestamptz,ends_at timestamptz,max_concurrent int DEFAULT 50,status text DEFAULT 'scheduled');",
 "CREATE TABLE public.lab_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,template_id uuid,student_id uuid NOT NULL,class_run_id uuid,cohort_reference text,status text DEFAULT 'provisioning',minutes_used int DEFAULT 0,idle_shutdown_minutes int DEFAULT 20,attempt_no int DEFAULT 1,created_at timestamptz DEFAULT now());",
 "CREATE TABLE public.lab_task_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,session_id uuid,task_id uuid,status text DEFAULT 'not_started',attempts int DEFAULT 0,verification_result jsonb DEFAULT '{}'::jsonb,completed_at timestamptz,UNIQUE(session_id,task_id));",
 "CREATE TABLE public.lab_help_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,session_id uuid,student_id uuid,message text,status text DEFAULT 'waiting',claimed_by uuid,claimed_at timestamptz,resolved_at timestamptz);",
 "CREATE TABLE public.lab_evidence(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,session_id uuid);",
 "ALTER TABLE public.lab_templates ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lab_tasks ENABLE ROW LEVEL SECURITY;",
 "ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lab_class_runs ENABLE ROW LEVEL SECURITY;",
 "ALTER TABLE public.lab_task_progress ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lab_help_requests ENABLE ROW LEVEL SECURITY;",
 "ALTER TABLE public.lab_provider_configs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.lab_evidence ENABLE ROW LEVEL SECURITY;",
 "CREATE POLICY \"lab templates tenant read\" ON public.lab_templates FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab tasks tenant read\" ON public.lab_tasks FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab session own academic read\" ON public.lab_sessions FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab progress own academic read\" ON public.lab_task_progress FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab help own academic read\" ON public.lab_help_requests FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab evidence own academic read\" ON public.lab_evidence FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab class tenant read\" ON public.lab_class_runs FOR SELECT TO authenticated USING(true);",
 "CREATE POLICY \"lab provider admin\" ON public.lab_provider_configs FOR ALL TO authenticated USING(true) WITH CHECK(true);"
].join('\n');
await db.exec(ddl);
// Replay main's practical-lab and coding foundations before the managed extension.
await db.exec(`CREATE TABLE public.live_class_sessions(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid);
ALTER TABLE public.lab_class_runs ADD COLUMN live_class_session_id uuid;
CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=public.get_user_tenant_id(auth.uid()) $$;`);
await db.exec(readFileSync('supabase/migrations/20261020130000_unipathway_lms_practical_lab_access.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261020140000_unipathway_browser_coding_workspaces.sql','utf8'));

await db.exec(readFileSync('supabase/migrations/20261022100000_unipathway_lms_lab_permissions.sql','utf8'));
await db.exec("GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;");
const root=(sql,params=[])=>db.query(sql,params);
async function actor(id,sql,params=[]){
 await db.query("SELECT set_config('app.test_uid',$1,false)",[id]);
 await db.exec('SET ROLE authenticated');
 try{return await db.query(sql,params);}
 finally{await db.exec('RESET ROLE');}
}
await root("INSERT INTO public.tenants(id) VALUES($1),($2)",[A,B]);
for(const [id,tenant,role] of [[S1,A,'student'],[S2,A,'student'],[S3,B,'student'],[L1,A,'lecturer'],[L2,B,'lecturer']]){
 await root('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2)',[id,tenant]);
 await root('INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,$3)',[id,tenant,role]);
}
await root('INSERT INTO public.modules(id,tenant_id,programme_id,lecturer_id,title) VALUES($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)',[M1,A,P1,L1,'Cloud A',M2,B,P2,L2,'Cloud B']);
for(const [tenant,programme,student] of [[A,P1,S1],[A,P1,S2],[B,P2,S3]]){
 await root("INSERT INTO public.student_enrolments(tenant_id,programme_id,student_id,status) VALUES($1,$2,$3,'active')",[tenant,programme,student]);
}
await root('INSERT INTO public.lab_templates(id,tenant_id,module_id,title,provider) VALUES($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)',[T1,A,M1,'Lab A','aws_managed',T2,B,M2,'Lab B','aws_managed']);
await root("INSERT INTO public.lab_provider_configs(tenant_id,provider,enabled,credential_status) VALUES($1,'aws_managed',true,'verified'),($2,'aws_managed',true,'verified')",[A,B]);
const insertOffering="INSERT INTO public.lms_lab_offerings(tenant_id,module_id,template_id,title,published,launch_enabled,created_by,max_active_learners) VALUES($1,$2,$3,$4,true,true,$5,2) RETURNING id";
const own=(await root(insertOffering,[A,M1,T1,'Cloud A hands-on',L1])).rows[0].id;
const other=(await root(insertOffering,[B,M2,T2,'Cloud B hands-on',L2])).rows[0].id;
assert.deepEqual((await actor(S1,'SELECT id FROM public.lms_lab_offerings')).rows.map(x=>x.id),[own]);checks++;
assert.deepEqual((await actor(S3,'SELECT id FROM public.lms_lab_offerings')).rows.map(x=>x.id),[other]);checks++;
assert.deepEqual((await actor(L1,'SELECT id FROM public.lms_lab_offerings')).rows.map(x=>x.id),[own]);checks++;
await assert.rejects(()=>actor(S1,"SELECT public.request_unipathway_managed_lab($1,'self_study',NULL)",[other]));checks++;
const session=(await actor(S1,"SELECT public.request_unipathway_managed_lab($1,'self_study',NULL) AS id",[own])).rows[0].id;
assert.ok(session);checks++;
const repeat=(await actor(S1,"SELECT public.request_unipathway_managed_lab($1,'self_study',NULL) AS id",[own])).rows[0].id;
assert.equal(session,repeat);checks++;
assert.equal((await actor(S2,'SELECT id FROM public.lab_sessions')).rows.length,0);checks++;
assert.equal((await actor(S1,'SELECT id FROM public.lab_sessions')).rows.length,1);checks++;
await assert.rejects(()=>actor(S2,"SELECT public.request_unipathway_managed_lab($1,'online',NULL)",[own]));checks++;
const run=(await root("INSERT INTO public.lab_class_runs(tenant_id,template_id,cohort_reference,lead_instructor_id,starts_at,ends_at,max_concurrent,status) VALUES($1,$2,'Cloud Week 2',$3,now()-interval '10 minutes',now()+interval '80 minutes',2,'active') RETURNING id",[A,T1,L1])).rows[0].id;
assert.equal((await actor(S2,'SELECT id FROM public.lab_class_runs')).rows.length,0);checks++;
assert.equal((await actor(L1,'SELECT public.invite_enrolled_unipathway_lab_class($1) AS n',[run])).rows[0].n,2);checks++;
assert.equal((await actor(L1,'SELECT public.invite_enrolled_unipathway_lab_class($1) AS n',[run])).rows[0].n,0);checks++;
assert.equal((await actor(S2,'SELECT id FROM public.lab_class_runs')).rows.length,1);checks++;
assert.ok((await actor(S2,"SELECT public.request_unipathway_managed_lab($1,'online',$2) AS id",[own,run])).rows[0].id);checks++;
await assert.rejects(()=>actor(S3,"SELECT public.request_unipathway_managed_lab($1,'online',$2)",[own,run]));checks++;
const taskId=(await root('INSERT INTO public.lab_tasks(tenant_id,template_id,sequence_no,title) VALUES($1,$2,1,$3) RETURNING id',[A,T1,'Private VPC'])).rows[0].id;
await actor(S1,'SELECT public.submit_unipathway_lab_task($1,$2,$3)',[session,taskId,'Created a private VPC in an isolated lab.']);
assert.equal((await actor(S1,'SELECT status FROM public.lab_task_progress')).rows[0].status,'pending_review');checks++;
await assert.rejects(()=>actor(S1,'SELECT public.review_unipathway_lab_task($1,$2,true,$3)',[session,taskId,'No self marking']));checks++;
await actor(L1,'SELECT public.review_unipathway_lab_task($1,$2,true,$3)',[session,taskId,'Checked by lecturer']);
assert.equal((await actor(S1,'SELECT status FROM public.lab_task_progress')).rows[0].status,'completed');checks++;
await actor(S1,'SELECT public.request_unipathway_lab_help($1,$2)',[session,'Cannot configure subnet routing']);
await assert.rejects(()=>actor(S1,'SELECT public.request_unipathway_lab_help($1,$2)',[session,'A duplicate help request']));checks++;
const helpId=(await actor(L1,"SELECT id FROM public.lab_help_requests WHERE status='waiting'")).rows[0].id;
await actor(L1,'SELECT public.claim_unipathway_lab_help($1,false)',[helpId]);
await actor(L1,'SELECT public.claim_unipathway_lab_help($1,true)',[helpId]);
assert.equal((await actor(S1,"SELECT id FROM public.lab_help_requests WHERE status='resolved'")).rows.length,1);checks++;
// Main's request RPC retains its template argument and remains callable.
assert.equal((await root("SELECT proargnames[1] AS name FROM pg_proc WHERE proname='request_unipathway_lms_lab'")).rows[0].name,'p_template');checks++;
await assert.rejects(()=>actor(S1,"SELECT public.request_unipathway_managed_lab($1,NULL,NULL)",[own]));checks++;
await root("UPDATE public.lms_lab_class_invitations SET status='revoked' WHERE run_id=$1 AND student_id=$2",[run,S2]);
await assert.rejects(()=>actor(S2,"SELECT public.request_unipathway_managed_lab($1,'online',$2)",[own,run]));checks++;
await assert.rejects(()=>actor(S1,"INSERT INTO public.lab_sessions(tenant_id,template_id,student_id) VALUES($1,$2,$3)",[A,T1,S1]));checks++;
await db.close();
console.log('UniPathway LMS lab RLS and RPC fixture passed: '+checks+' checks');
