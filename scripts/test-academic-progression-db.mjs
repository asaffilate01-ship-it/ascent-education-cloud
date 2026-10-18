import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001';
const OTHER='10000000-0000-0000-0000-000000000002';
const MANAGER='20000000-0000-0000-0000-000000000001';
const STUDENT='20000000-0000-0000-0000-000000000002';
const OUTSIDER='20000000-0000-0000-0000-000000000003';
let checks=0;
await db.exec([
 'CREATE ROLE authenticated;',
 'CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;',
 'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
 "CREATE TYPE public.app_role AS ENUM('student','centre_director','superadmin','admissions_admin','programme_leader');",
 'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
 'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND role=r) $$;"
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017194000_academic_progression_sources.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,OTHER]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[MANAGER,STUDENT,OUTSIDER]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,$2,'student'),($4,$5,'student')",[MANAGER,T,STUDENT,OUTSIDER,OTHER]);
async function as(uid,tenant,fn){
 await db.exec('SET ROLE authenticated;');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await fn();}finally{await db.exec('RESET ROLE;');}
}
async function denied(fn){await assert.rejects(fn);checks++;}
const evidenceId=await as(MANAGER,T,async()=>{
 await denied(()=>db.query("INSERT INTO public.academic_progression_evidence(tenant_id,awarding_body,qualification_name,qualification_level,destination_country,destination_institution,destination_programme,review_status,student_visible) VALUES($1,'OTHM','Business Diploma','Level 5','UK','Example University','Top-Up Business','verified',true)",[T]));
 const created=await db.query("INSERT INTO public.academic_progression_evidence(tenant_id,awarding_body,qualification_name,qualification_level,destination_country,destination_institution,destination_programme) VALUES($1,'OTHM','Business Diploma','Level 5','UK','Example University','Top-Up Business') RETURNING id,review_status,student_visible",[T]);
 assert.equal(created.rows[0].review_status,'proposed');
 assert.equal(created.rows[0].student_visible,false);checks++;
 return created.rows[0].id;
});
await as(STUDENT,T,async()=>{
 const hidden=await db.query('SELECT id FROM public.academic_progression_evidence');
 assert.equal(hidden.rows.length,0);checks++;
 await denied(()=>db.query("INSERT INTO public.academic_progression_evidence(tenant_id,awarding_body,qualification_name,qualification_level,destination_country,destination_institution,destination_programme) VALUES($1,'OTHM','Business Diploma','Level 5','UK','Fake U','Course')",[T]));
});
await as(MANAGER,T,async()=>{
 await denied(()=>db.query("UPDATE public.academic_progression_evidence SET review_status='verified',student_visible=true WHERE id=$1",[evidenceId]));
 const reviewed=await db.query("UPDATE public.academic_progression_evidence SET source_url='https://example.edu/official-progression',source_kind='university_official_page',recheck_due=current_date+180,review_status='verified',student_visible=true WHERE id=$1 RETURNING reviewed_by,reviewed_at,student_visible",[evidenceId]);
 assert.equal(reviewed.rows[0].reviewed_by,MANAGER);
 assert.ok(reviewed.rows[0].reviewed_at);
 assert.equal(reviewed.rows[0].student_visible,true);checks++;
 const audit=await db.query("SELECT count(*)::int AS count FROM public.academic_progression_audit WHERE evidence_id=$1",[evidenceId]);
 assert.equal(audit.rows[0].count,2);checks++;
});
await as(STUDENT,T,async()=>{
 const published=await db.query('SELECT destination_institution,source_url FROM public.academic_progression_evidence');
 assert.equal(published.rows.length,1);
 assert.equal(published.rows[0].destination_institution,'Example University');checks++;
 const noAudit=await db.query('SELECT id FROM public.academic_progression_audit');
 assert.equal(noAudit.rows.length,0);checks++;
});
await as(OUTSIDER,OTHER,async()=>{
 const inaccessible=await db.query('SELECT id FROM public.academic_progression_evidence');
 assert.equal(inaccessible.rows.length,0);checks++;
 const unchangeable=await db.query("UPDATE public.academic_progression_evidence SET student_visible=false WHERE id=$1 RETURNING id",[evidenceId]);
 assert.equal(unchangeable.rows.length,0);checks++;
});
await as(MANAGER,T,async()=>{
 const revised=await db.query("UPDATE public.academic_progression_evidence SET grade_requirements='Merit grades required' WHERE id=$1 RETURNING review_status,student_visible,reviewed_by",[evidenceId]);
 assert.equal(revised.rows[0].review_status,'under_review');
 assert.equal(revised.rows[0].student_visible,false);
 assert.equal(revised.rows[0].reviewed_by,null);checks++;
});
await as(STUDENT,T,async()=>{
 const after=await db.query('SELECT id FROM public.academic_progression_evidence');
 assert.equal(after.rows.length,0);checks++;
});
await db.close();
console.log('Academic progression evidence RLS and re-review tests passed ('+checks+' checks).');
