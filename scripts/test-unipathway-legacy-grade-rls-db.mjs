import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const db=new PGlite();
const A='10000000-0000-0000-0000-000000000001',B='10000000-0000-0000-0000-000000000002';
const DIRECTOR='20000000-0000-0000-0000-000000000001';
const STUDENT='20000000-0000-0000-0000-000000000002';
const LECTURER='20000000-0000-0000-0000-000000000003';
const OUTSIDER='20000000-0000-0000-0000-000000000004';
let checks=0;
await db.exec([
 'CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;',
 'GRANT USAGE ON SCHEMA public,auth TO authenticated;',
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','superadmin');",
 'CREATE TABLE public.user_roles(user_id uuid NOT NULL,role public.app_role,tenant_id uuid);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles v WHERE v.user_id=u AND v.role=r AND (v.tenant_id IS NULL OR v.tenant_id=public.get_user_tenant_id(u))) $$;",
 'CREATE TABLE public.submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,student_id uuid NOT NULL,grade numeric,feedback text,status text,submitted_at timestamptz DEFAULT now());',
 'ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;',
 "CREATE POLICY \"Students view own submissions\" ON public.submissions FOR SELECT TO authenticated USING(student_id=auth.uid());",
 "CREATE POLICY \"Students insert own submissions\" ON public.submissions FOR INSERT TO authenticated WITH CHECK(student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()));",
 "CREATE POLICY \"Staff manage submissions\" ON public.submissions FOR ALL TO authenticated USING((public.has_role(auth.uid(),'lecturer'::public.app_role) OR public.has_role(auth.uid(),'centre_director'::public.app_role)) AND tenant_id=public.get_user_tenant_id(auth.uid()));",
 'GRANT SELECT,INSERT,UPDATE,DELETE ON public.submissions TO authenticated;'
].join('\n'));
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,$2,'student'),($4,$2,'lecturer'),($5,$6,'student')",[DIRECTOR,A,STUDENT,LECTURER,OUTSIDER,B]);
await db.query("INSERT INTO public.submissions(tenant_id,student_id,grade,feedback,status) VALUES($1,$2,58,'Unapproved marker draft','graded'),($3,$4,91,'Other-tenant private','graded')",[A,STUDENT,B,OUTSIDER]);
async function as(user,tenant,action){
 await db.exec('SET ROLE authenticated');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[user,tenant]);
 try{return await action();}finally{await db.exec('RESET ROLE')}
}
await as(STUDENT,A,async()=>{
 const before=await db.query('SELECT grade FROM public.submissions');
 assert.equal(before.rows.length,1);
 assert.equal(Number(before.rows[0].grade),58,'Fixture demonstrates known legacy premature-grade exposure');checks++;
});
await db.exec(readFileSync('supabase/migrations/20261020180000_legacy_submission_grade_cutover.sql','utf8'));
await as(STUDENT,A,async()=>{
 const after=await db.query('SELECT grade FROM public.submissions');
 assert.equal(after.rows.length,0,'Student no longer sees any legacy provisional grades');checks++;
});
await as(LECTURER,A,async()=>{
 assert.equal((await db.query('SELECT grade FROM public.submissions')).rows.length,0,'Lecturer cannot use legacy direct grading');checks++;
 await assert.rejects(()=>db.query("UPDATE public.submissions SET grade=99 WHERE student_id=$1",[STUDENT]));checks++;
});
await as(DIRECTOR,A,async()=>{
 const rows=await db.query('SELECT grade,feedback FROM public.submissions');
 assert.equal(rows.rows.length,1,'Director can audit archived original data for migration');
 assert.equal(Number(rows.rows[0].grade),58);checks++;
 await assert.rejects(()=>db.query("UPDATE public.submissions SET grade=100 WHERE student_id=$1",[STUDENT]));checks++;
});
await as(OUTSIDER,B,async()=>{
 assert.equal((await db.query('SELECT grade FROM public.submissions')).rows.length,0,'No other student can see legacy grades');checks++;
});
const preserved=await db.query('SELECT COUNT(*)::int AS n FROM public.submissions');
assert.equal(preserved.rows[0].n,2,'No original work/grades deleted during RLS cutover');checks++;
const policies=await db.query("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='submissions'");
assert.equal(policies.rows.length,1);checks++;
assert.equal(policies.rows[0].policyname,'legacy coursework archived audit by academic director only');checks++;
await db.close();
console.log('Legacy provisional grade exposure and direct-marking cutover: '+checks+' checks passed.');
