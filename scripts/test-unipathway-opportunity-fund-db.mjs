import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const TENANT='10000000-0000-0000-0000-000000000001',OTHER_TENANT='10000000-0000-0000-0000-000000000002';
const ADMIN='20000000-0000-0000-0000-000000000001',DIRECTOR='20000000-0000-0000-0000-000000000002',LEARNER='20000000-0000-0000-0000-000000000003',REVIEWER='20000000-0000-0000-0000-000000000004',EMPLOYER='20000000-0000-0000-0000-000000000005';
let checks=0;
await db.exec([
'CREATE ROLE authenticated;',
'CREATE ROLE anon;',
'CREATE SCHEMA auth;',
'GRANT USAGE ON SCHEMA public,auth TO authenticated;',
"CREATE TYPE public.app_role AS ENUM ('superadmin','centre_director','finance_officer','admissions_admin','student','employer_partner');",
'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
'CREATE TABLE public.user_roles(user_id uuid,role public.app_role);',
"CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
"CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT nullif(current_setting('test.tenant',true),'')::uuid $$;",
"CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles x WHERE x.user_id=u AND x.role=r) $$;",
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261019160000_unipathway_opportunity_fund.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[TENANT,OTHER_TENANT]);
await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'superadmin'),($2,'centre_director'),($3,'student'),($4,'centre_director'),($5,'employer_partner')",[ADMIN,DIRECTOR,LEARNER,REVIEWER,EMPLOYER]);
async function as(user,tenant,fn){
 await db.exec('SET ROLE authenticated');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[user,tenant]);
 try{return await fn()}finally{await db.exec('RESET ROLE');}
}
async function blocked(fn){await assert.rejects(fn);checks++;}
let fund;
await as(ADMIN,TENANT,async()=>{
 const r=await db.query("INSERT INTO public.unipathway_foundation_programmes(tenant_id,name,academic_year,approved_internal_budget_pkr,policy_reference) VALUES($1,'Opportunity Fund','2026–2027',100,'PRIVATE-POLICY') RETURNING id",[TENANT]);
 fund=r.rows[0].id;checks++;
 const p=await db.query("INSERT INTO public.unipathway_foundation_sponsorships(tenant_id,programme_id,sponsor_type,sponsor_display_reference,pledge_pkr) VALUES($1,$2,'employer','SPONSOR-ONE',1000) RETURNING id",[TENANT,fund]);
 assert.equal(p.rows.length,1);checks++;
 await blocked(()=>db.query("INSERT INTO public.unipathway_foundation_sponsorships(tenant_id,programme_id,sponsor_type,sponsor_display_reference,pledge_pkr,verified_received_pkr) VALUES($1,$2,'employer','BAD-PLEDGE',1000,1000)",[TENANT,fund]));
 await blocked(()=>db.query("INSERT INTO public.unipathway_foundation_sponsorships(tenant_id,programme_id,sponsor_type,sponsor_display_reference,pledge_pkr) VALUES($1,$2,'employer','OTHER',1000)",[OTHER_TENANT,fund]));
});
let candidate;
await as(DIRECTOR,TENANT,async()=>{
 await blocked(()=>db.query("INSERT INTO public.unipathway_foundation_scholarship_cases(tenant_id,programme_id,applicant_reference,academic_stage,age_category,applicant_requested_pkr) VALUES($1,$2,'APPL-MINOR-001','HSSC','minor',150)",[TENANT,fund]));
 const r=await db.query("INSERT INTO public.unipathway_foundation_scholarship_cases(tenant_id,programme_id,applicant_reference,academic_stage,age_category,guardian_consent_reference,applicant_consent_reference,academic_score,academic_evidence_reference,financial_need_band,financial_evidence_reference,applicant_requested_pkr,status) VALUES($1,$2,'APPL-MINOR-001','HSSC','minor','GUARDIAN-CONSENT','APPLICANT-CONSENT',87,'ACADEMIC-REF','high','FINANCIAL-PRIVATE',150,'draft') RETURNING id",[TENANT,fund]);
 candidate=r.rows[0].id;checks++;
 const deny=await db.query("UPDATE public.unipathway_foundation_scholarship_cases SET status='approved',awarded_pkr=50 WHERE id=$1 RETURNING id",[candidate]);
 assert.equal(deny.rows.length,0);checks++;
});
await as(EMPLOYER,TENANT,async()=>{
 const p=await db.query('SELECT id FROM public.unipathway_foundation_scholarship_cases');
 assert.equal(p.rows.length,0);checks++;
 const s=await db.query('SELECT id FROM public.unipathway_foundation_sponsorships');
 assert.equal(s.rows.length,0);checks++;
});
await as(LEARNER,TENANT,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_foundation_scholarship_cases');
 assert.equal(r.rows.length,0);checks++;
});
await as(ADMIN,TENANT,async()=>{
 await blocked(()=>db.query("UPDATE public.unipathway_foundation_scholarship_cases SET status='approved',awarded_pkr=200,independently_reviewed_by=$1,selection_policy_reference='PRIVATE-POLICY',selection_notes='Reviewed',approved_by=$2,approved_at=now() WHERE id=$3",[REVIEWER,ADMIN,candidate]));
 const approved=await db.query("UPDATE public.unipathway_foundation_scholarship_cases SET status='approved',awarded_pkr=90,independently_reviewed_by=$1,selection_policy_reference='PRIVATE-POLICY',selection_notes='Evidence reviewed',approved_by=$2,approved_at=now() WHERE id=$3 RETURNING id,status",[REVIEWER,ADMIN,candidate]);
 assert.equal(approved.rows[0].status,'approved');checks++;
 const r=await db.query("INSERT INTO public.unipathway_foundation_scholarship_cases(tenant_id,programme_id,applicant_reference,academic_stage,age_category,applicant_consent_reference,academic_score,academic_evidence_reference,financial_need_band,financial_evidence_reference,applicant_requested_pkr) VALUES($1,$2,'APPL-SECOND-002','A Levels','adult','CONSENT',95,'ACADEMIC-REF','critical','FINANCIAL-REF',100) RETURNING id",[TENANT,fund]);
 await blocked(()=>db.query("UPDATE public.unipathway_foundation_scholarship_cases SET status='approved',awarded_pkr=20,independently_reviewed_by=$1,selection_policy_reference='PRIVATE-POLICY',selection_notes='Reviewed',approved_by=$2,approved_at=now() WHERE id=$3",[REVIEWER,ADMIN,r.rows[0].id]));
 const remaining=await db.query("SELECT approved_internal_budget_pkr FROM public.unipathway_foundation_programmes WHERE id=$1",[fund]);assert.equal(Number(remaining.rows[0].approved_internal_budget_pkr),100);checks++;
});
await as(ADMIN,OTHER_TENANT,async()=>{
 await blocked(()=>db.query("INSERT INTO public.unipathway_foundation_scholarship_cases(tenant_id,programme_id,applicant_reference,academic_stage,age_category,applicant_requested_pkr) VALUES($1,$2,'OTHER-COURSE-003','HSSC','adult',100)",[OTHER_TENANT,fund]));
});
await db.close();
console.log('UniPathway Opportunity Fund approval and privacy RLS tests passed ('+checks+' checks).');
