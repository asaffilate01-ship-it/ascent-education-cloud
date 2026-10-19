import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const T1='10000000-0000-0000-0000-000000000001',T2='10000000-0000-0000-0000-000000000002';
const DIRECTOR='20000000-0000-0000-0000-000000000001',SUPER='20000000-0000-0000-0000-000000000002';
const STUDENT='20000000-0000-0000-0000-000000000003',LEADER='20000000-0000-0000-0000-000000000004';
const OUTSIDE='20000000-0000-0000-0000-000000000005';
const PROG='30000000-0000-0000-0000-000000000001',MODULE='30000000-0000-0000-0000-000000000002';
let checks=0;
await db.exec([
  'CREATE ROLE authenticated;',
  'CREATE ROLE anon;',
  'CREATE SCHEMA auth;',
  'GRANT USAGE ON SCHEMA public,auth TO authenticated;',
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
  "CREATE TYPE public.app_role AS ENUM ('centre_director','programme_leader','iqa_officer','superadmin','student');",
  'CREATE TABLE public.tenants(id uuid PRIMARY KEY,name text);',
  'CREATE TABLE public.user_roles(user_id uuid NOT NULL,tenant_id uuid,role public.app_role NOT NULL);',
  'CREATE TABLE public.programmes(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,title text);',
  'CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,programme_id uuid NOT NULL,title text);',
  "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid',true),'')::uuid $$;",
  "CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT NULLIF(current_setting('test.tenant',true),'')::uuid $$;",
  "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r AND (tenant_id IS NULL OR tenant_id=public.get_user_tenant_id(u))) $$;",
  'GRANT SELECT ON public.tenants,public.programmes,public.modules TO authenticated;',
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261018215000_unipathway_beauty_curriculum_readiness.sql','utf8'));
await db.query('INSERT INTO public.tenants(id,name) VALUES($1,\'UniPathway\'),($2,\'Other Centre\')',[T1,T2]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3),($4),($5)',[DIRECTOR,SUPER,STUDENT,LEADER,OUTSIDE]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,NULL,'superadmin'),($4,$2,'student'),($5,$2,'programme_leader'),($6,$7,'student')",[DIRECTOR,T1,SUPER,STUDENT,LEADER,OUTSIDE,T2]);
await db.query('INSERT INTO public.programmes(id,tenant_id,title) VALUES($1,$2,\'Beauty Theory and Practice\')',[PROG,T1]);
await db.query('INSERT INTO public.modules(id,tenant_id,programme_id,title) VALUES($1,$2,$3,\'Facial Skincare\')',[MODULE,T1,PROG]);

async function as(uid,tenant,fn){
 await db.exec('SET ROLE authenticated');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await fn();}
 finally{await db.exec('RESET ROLE');}
}
async function mustFail(fn){
 await assert.rejects(fn);checks++;
}
let caseId;
await as(DIRECTOR,T1,async()=>{
 const r=await db.query("INSERT INTO public.unipathway_accreditation_cases(tenant_id,scheme) VALUES($1,'cibtac_centre') RETURNING id,status",[T1]);
 caseId=r.rows[0].id;assert.equal(r.rows[0].status,'research');checks++;
 const log=await db.query('SELECT to_status FROM public.unipathway_accreditation_events WHERE case_id=$1',[caseId]);
 assert.equal(log.rows.length,1);assert.equal(log.rows[0].to_status,'research');checks++;
 await mustFail(()=>db.query("UPDATE public.unipathway_accreditation_cases SET status='approved' WHERE id=$1",[caseId]));
 await mustFail(()=>db.query("INSERT INTO public.unipathway_accreditation_cases(tenant_id,scheme) VALUES($1,'cpduk_provider')",[T2]));
});
await as(STUDENT,T1,async()=>{
 const found=await db.query('SELECT id FROM public.unipathway_accreditation_cases');
 assert.equal(found.rows.length,0);checks++;
 await mustFail(()=>db.query("INSERT INTO public.unipathway_accreditation_cases(tenant_id,scheme) VALUES($1,'cpduk_provider')",[T1]));
});
await as(OUTSIDE,T2,async()=>{
 const found=await db.query('SELECT id FROM public.unipathway_accreditation_cases');
 assert.equal(found.rows.length,0);checks++;
});
await as(SUPER,T1,async()=>{
 await mustFail(()=>db.query("UPDATE public.unipathway_accreditation_cases SET status='approved',verified_by=$1,decided_at=now() WHERE id=$2",[SUPER,caseId]));
 const approved=await db.query("UPDATE public.unipathway_accreditation_cases SET status='approved',application_reference='CIBTAC-APP-42',evidence_reference='PRIVATE-DOC-01',verified_by=$1,decided_at=now() WHERE id=$2 RETURNING status",[SUPER,caseId]);
 assert.equal(approved.rows[0].status,'approved');checks++;
});
await as(DIRECTOR,T1,async()=>{
 const logs=await db.query('SELECT from_status,to_status FROM public.unipathway_accreditation_events WHERE case_id=$1 ORDER BY changed_at',[caseId]);
 assert.equal(logs.rows.at(-1).to_status,'approved');checks++;
});
let reviewId, unitId;
await as(DIRECTOR,T1,async()=>{
 const r=await db.query("INSERT INTO public.unipathway_curriculum_reviews(tenant_id,awarding_body,qualification_code,qualification_title,qualification_source_url,programme_id,required_unit_count) VALUES($1,'CIBTAC','CBA04','Level 2 Facial Skincare','https://www.cibtac.com/Qualifications/Beauty/Beauty-Therapy',$2,1) RETURNING id,review_status",[T1,PROG]);
 reviewId=r.rows[0].id;assert.equal(r.rows[0].review_status,'draft');checks++;
 await mustFail(()=>db.query("UPDATE public.unipathway_curriculum_reviews SET review_status='approved' WHERE id=$1",[reviewId]));
 const u=await db.query("INSERT INTO public.unipathway_curriculum_units(tenant_id,review_id,unit_reference,unit_title,specification_source_url,lms_module_id,material_manifest_reference) VALUES($1,$2,'CBA04-U1','Safety and facial skincare','https://www.cibtac.com/Qualifications/Beauty/Beauty-Therapy',$3,'PRIVATE-MATERIAL-001') RETURNING id",[T1,reviewId,MODULE]);
 unitId=u.rows[0].id;checks++;
 await db.query('UPDATE public.unipathway_curriculum_reviews SET mapped_unit_count=1 WHERE id=$1',[reviewId]);
 await db.query("UPDATE public.unipathway_curriculum_units SET approval_status='reviewed' WHERE id=$1",[unitId]);
});
await as(SUPER,T1,async()=>{
 await mustFail(()=>db.query("UPDATE public.unipathway_curriculum_reviews SET review_status='approved',approved_by=$1,approved_at=now(),centre_permission_reference='APP-42',approval_evidence_reference='APPROVAL-DOC',trainer_evidence_reference='TRAIN-01',assessment_evidence_reference='ASSMT-01',delivery_plan_reference='PLAN-01' WHERE id=$2",[SUPER,reviewId]));
 await db.query("UPDATE public.unipathway_curriculum_units SET approval_status='approved' WHERE id=$1",[unitId]);
 const good=await db.query("UPDATE public.unipathway_curriculum_reviews SET review_status='approved',approved_by=$1,approved_at=now(),centre_permission_reference='APP-42',approval_evidence_reference='APPROVAL-DOC',trainer_evidence_reference='TRAIN-01',assessment_evidence_reference='ASSMT-01',delivery_plan_reference='PLAN-01' WHERE id=$2 RETURNING id,review_status",[SUPER,reviewId]);
 assert.equal(good.rows[0].review_status,'approved');checks++;
 await mustFail(()=>db.query("UPDATE public.unipathway_curriculum_units SET unit_title='Changed after approval' WHERE id=$1",[unitId]));
});
await as(LEADER,T1,async()=>{
 const visible=await db.query('SELECT id FROM public.unipathway_curriculum_reviews');
 assert.equal(visible.rows.length,1);checks++;
 const rejected=await db.query("UPDATE public.unipathway_curriculum_reviews SET review_status='suspended' WHERE id=$1 RETURNING id",[reviewId]);
 assert.equal(rejected.rows.length,0,'Programme leader must not change an approved curriculum');checks++;
});
await as(OUTSIDE,T2,async()=>{
 const items=await db.query('SELECT id FROM public.unipathway_curriculum_units');
 assert.equal(items.rows.length,0);checks++;
});
await db.close();
console.log('UniPathway CIBTAC/CPD and LMS approval gate staging tests passed ('+checks+' checks).');
