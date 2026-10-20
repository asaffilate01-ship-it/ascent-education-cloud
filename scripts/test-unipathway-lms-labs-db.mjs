import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const A='10000000-0000-0000-0000-000000000001',B='10000000-0000-0000-0000-000000000002';
const DIRECTOR='20000000-0000-0000-0000-000000000001';
const LECTURER='20000000-0000-0000-0000-000000000002';
const STUDENT='20000000-0000-0000-0000-000000000003';
const OTHER='20000000-0000-0000-0000-000000000004';
const OUTSIDER='20000000-0000-0000-0000-000000000005';
const prog='30000000-0000-0000-0000-000000000001';
const mod='40000000-0000-0000-0000-000000000001';
let checks=0;
const mustReject=async(action,pattern)=>{
 await assert.rejects(action,pattern);checks++;
};
await db.exec([
 'CREATE ROLE authenticated; CREATE ROLE anon;',
 'CREATE SCHEMA auth; GRANT USAGE ON SCHEMA public,auth TO authenticated;',
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','programme_leader','superadmin');",
 "CREATE TABLE public.user_roles(user_id uuid NOT NULL,tenant_id uuid,role public.app_role);",
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.get_user_tenant_id(p_user uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(p_user uuid,p_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles u WHERE u.user_id=p_user AND u.role=p_role AND (u.tenant_id IS NULL OR u.tenant_id=public.get_user_tenant_id(p_user))) $$;",
 "CREATE FUNCTION public.same_tenant(p_tenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p_tenant=public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(),'superadmin'::public.app_role) $$;",
 "CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,programme_id uuid NOT NULL,lecturer_id uuid,title text NOT NULL);",
 "CREATE TABLE public.student_enrolments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,programme_id uuid NOT NULL,student_id uuid NOT NULL,status text NOT NULL);",
 "CREATE TABLE public.live_class_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,module_id uuid);",
 "CREATE TABLE public.lab_templates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,module_id uuid REFERENCES public.modules(id),title text NOT NULL,provider text NOT NULL CHECK(provider IN ('unipathway_container','github_codespaces','aws_academy','azure','jupyter','managed_lab')),environment_reference text,duration_minutes int NOT NULL DEFAULT 90,max_attempts int NOT NULL DEFAULT 2,instructor_observe bool DEFAULT true,instructor_assist bool DEFAULT true,active bool DEFAULT true);",
 "CREATE TABLE public.lab_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,template_id uuid NOT NULL REFERENCES public.lab_templates(id),sequence_no integer NOT NULL,title text NOT NULL,instructions text,verification_type text DEFAULT 'manual',verification_config jsonb DEFAULT '{}'::jsonb,points numeric DEFAULT 0,UNIQUE(template_id,sequence_no));",
 "CREATE TABLE public.lab_class_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,template_id uuid NOT NULL REFERENCES public.lab_templates(id),cohort_reference text NOT NULL,live_class_session_id uuid REFERENCES public.live_class_sessions(id),lead_instructor_id uuid NOT NULL,ta_user_ids uuid[] NOT NULL DEFAULT '{}',starts_at timestamptz,ends_at timestamptz,max_concurrent int DEFAULT 50,status text NOT NULL DEFAULT 'scheduled',created_at timestamptz NOT NULL DEFAULT now());",
 "CREATE TABLE public.lab_provider_configs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,provider text NOT NULL,display_name text NOT NULL,enabled bool NOT NULL DEFAULT false,credential_status text NOT NULL DEFAULT 'required',capabilities jsonb DEFAULT '{}'::jsonb,budget_monthly numeric,metadata jsonb DEFAULT '{}'::jsonb,UNIQUE(tenant_id,provider));",
 "CREATE TABLE public.lab_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,template_id uuid NOT NULL REFERENCES public.lab_templates(id),student_id uuid NOT NULL,created_at timestamptz DEFAULT now());",
 "CREATE TABLE public.lab_task_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,session_id uuid NOT NULL REFERENCES public.lab_sessions(id),task_id uuid NOT NULL REFERENCES public.lab_tasks(id));",
 "CREATE TABLE public.lab_help_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,session_id uuid NOT NULL REFERENCES public.lab_sessions(id),student_id uuid NOT NULL);",
 "CREATE TABLE public.lab_evidence(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,session_id uuid NOT NULL REFERENCES public.lab_sessions(id),task_id uuid REFERENCES public.lab_tasks(id));",
].join('\n'));
for(const table of ['lab_templates','lab_tasks','lab_class_runs','lab_provider_configs','lab_sessions','lab_task_progress','lab_help_requests','lab_evidence']){
 await db.exec('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY');
}
await db.exec([
 'CREATE POLICY "lab templates tenant read" ON public.lab_templates FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab tasks tenant read" ON public.lab_tasks FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab class tenant read" ON public.lab_class_runs FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab session own academic read" ON public.lab_sessions FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab progress own academic read" ON public.lab_task_progress FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab help own academic read" ON public.lab_help_requests FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
 'CREATE POLICY "lab evidence own academic read" ON public.lab_evidence FOR SELECT TO authenticated USING(public.same_tenant(tenant_id));',
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261020130000_unipathway_lms_practical_lab_access.sql','utf8'));
await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated');
await db.query("INSERT INTO public.modules(id,tenant_id,programme_id,lecturer_id,title) VALUES($1,$2,$3,$4,'Cloud & Python Labs')",[mod,A,prog,LECTURER]);
await db.query("INSERT INTO public.student_enrolments(tenant_id,programme_id,student_id,status) VALUES($1,$2,$3,'active'),($1,$2,$4,'active')",[A,prog,STUDENT,OTHER]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES ($1,$2,'centre_director'),($3,$2,'lecturer'),($4,$2,'student'),($5,$2,'student'),($6,$7,'student')",[DIRECTOR,A,LECTURER,STUDENT,OTHER,OUTSIDER,B]);
let template,task,run;
const as=async(uid,tenant,action)=>{
 await db.exec('SET ROLE authenticated');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await action()}finally{await db.exec('RESET ROLE')}
};
await as(LECTURER,A,async()=>{
 const scope=await db.query("SELECT auth.uid()::text AS uid, public.get_user_tenant_id(auth.uid())::text AS tenant, public.has_role(auth.uid(),'lecturer'::public.app_role) AS lecturer, public.same_tenant($1) AS same_tenant",[A]);
 console.log('Synthetic lecturer policy fixtures:',scope.rows[0]);
 const moduleCheck=await db.query('SELECT id FROM public.modules WHERE id=$1',[mod]);
 console.log('Fixture module read count:',moduleCheck.rows.length);
 const allowed=await db.query('SELECT public.can_create_uni_lab_in_module($1,$2) AS allowed',[mod,A]);
 console.log('Module authorisation predicate:',allowed.rows[0]);
 await db.query("INSERT INTO public.lab_templates(tenant_id,module_id,title,provider,created_by,access_mode,published,estimated_cost_gbp) VALUES($1,$2,'AWS VPC Lab','aws_managed',$3,'both',false,8)",[A,mod,LECTURER]);
 const t=await db.query("SELECT id FROM public.lab_templates WHERE title='AWS VPC Lab'");
 template=t.rows[0]?.id;checks++;
 const q=await db.query("INSERT INTO public.lab_tasks(tenant_id,template_id,sequence_no,title,instructions) VALUES($1,$2,1,'Create private subnet','Explain your route tables') RETURNING id",[A,template]);
 task=q.rows[0].id;checks++;
 await db.query("UPDATE public.lab_templates SET published=true WHERE id=$1",[template]);checks++;
 const r=await db.query("INSERT INTO public.lab_class_runs(tenant_id,template_id,cohort_reference,lead_instructor_id,max_concurrent) VALUES($1,$2,'Morning Teams cloud group',$3,1) RETURNING id",[A,template,LECTURER]);run=r.rows[0].id;checks++;
});
await as(STUDENT,A,async()=>{
 const visible=await db.query('SELECT id FROM public.lab_templates');assert.equal(visible.rows.length,1);checks++;
 await mustReject(()=>db.query("SELECT public.request_unipathway_lms_lab($1,'self_study',NULL)",[template]),/provider is not activated/i);
});
await as(OUTSIDER,B,async()=>{
 const visible=await db.query('SELECT id FROM public.lab_templates');assert.equal(visible.rows.length,0);checks++;
 await mustReject(()=>db.query("SELECT public.request_unipathway_lms_lab($1,'self_study',NULL)",[template]),/enrolment|access/i);
});
await as(LECTURER,A,async()=>{
 const count=await db.query('SELECT public.invite_enrolled_unipathway_lab_run($1) AS invited',[run]);
 assert.equal(Number(count.rows[0].invited),2);checks++;
});
await db.query("INSERT INTO public.lab_provider_configs(tenant_id,provider,display_name,enabled,credential_status,verified_at,budget_monthly,budget_currency,max_concurrent) VALUES($1,'aws_managed','AWS managed staging',true,'verified',now(),8,'GBP',1)",[A]);
let request;
await as(STUDENT,A,async()=>{
 const created=await db.query("SELECT public.request_unipathway_lms_lab($1,'self_study',NULL) AS id",[template]);
 request=created.rows[0].id;checks++;
 const record=await db.query('SELECT status,provider_resource_reference FROM public.unipathway_lab_launch_requests WHERE id=$1',[request]);
 assert.equal(record.rows[0].status,'awaiting_provider');assert.equal(record.rows[0].provider_resource_reference,null);checks++;
 const repeated=await db.query("SELECT public.request_unipathway_lms_lab($1,'self_study',NULL) AS id",[template]);
 assert.equal(repeated.rows[0].id,request);checks++;
 const note=await db.query("SELECT public.save_unipathway_lab_practice_note($1,'Configured subnet and validated tables',true) AS id",[task]);
 assert.equal(note.rows.length,1);checks++;
 await mustReject(()=>db.query("SELECT public.save_unipathway_lab_practice_note($1,'change',false)",[task]),/submitted/i);
 const help=await db.query("SELECT public.request_unipathway_lab_support($1,'I need help debugging routing') AS id",[request]);
 assert.equal(help.rows.length,1);checks++;
 await mustReject(()=>db.query("SELECT public.answer_unipathway_lab_support($1,'answered')",[help.rows[0].id]),/assigned/i);
});
await as(OTHER,A,async()=>{
 const visible=await db.query('SELECT id FROM public.unipathway_lab_launch_requests');
 assert.equal(visible.rows.length,0);checks++;
 await mustReject(()=>db.query("SELECT public.request_unipathway_lms_lab($1,'self_study',NULL)",[template]),/capacity|budget/i);
});
await as(LECTURER,A,async()=>{
 const evidence=await db.query("SELECT id FROM public.unipathway_lab_task_notes WHERE student_id=$1",[STUDENT]);
 assert.equal(evidence.rows.length,1);checks++;
 await db.query("SELECT public.review_unipathway_lab_practice_note($1,'Good subnet configuration')",[evidence.rows[0].id]);checks++;
 const help=await db.query('SELECT id FROM public.unipathway_lab_support_requests WHERE student_id=$1',[STUDENT]);
 assert.equal(help.rows.length,1);checks++;
 await db.query("SELECT public.answer_unipathway_lab_support($1,'Review the VPC route table')",[help.rows[0].id]);checks++;
});
await as(STUDENT,A,async()=>{
 const note=await db.query('SELECT status,reviewer_feedback FROM public.unipathway_lab_task_notes WHERE task_id=$1',[task]);
 assert.equal(note.rows[0].status,'reviewed');assert.equal(note.rows[0].reviewer_feedback,'Good subnet configuration');checks++;
 const help=await db.query('SELECT response,status FROM public.unipathway_lab_support_requests');
 assert.equal(help.rows[0].status,'resolved');checks++;
});
const remaining=await db.query("SELECT count(*) AS n FROM public.lab_sessions");
assert.equal(Number(remaining.rows[0].n),0,'No cloud resources or running labs fabricated by LMS queue');checks++;
await db.close();
console.log('UniPathway LMS lab RLS, enrolments, queue, budget, self-study and tutor workflow: '+checks+' checks passed.');
