import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {employerActivationSql} from './activation/prepare-unipathway-employers.mjs';
import {employerPrivacySql} from './activation/prepare-unipathway-employer-privacy.mjs';
const db=new PGlite(),T1='10000000-0000-0000-0000-000000000001',T2='10000000-0000-0000-0000-000000000002';
const DIRECTOR='20000000-0000-0000-0000-000000000001',EMP='20000000-0000-0000-0000-000000000002';
const STUDENT='20000000-0000-0000-0000-000000000003',OTHER='20000000-0000-0000-0000-000000000004',ADMISSIONS='20000000-0000-0000-0000-000000000005',SECOND_STUDENT='20000000-0000-0000-0000-000000000006';
let checks=0;
await db.exec([
'CREATE ROLE authenticated;','CREATE ROLE anon;',
'CREATE SCHEMA auth;','GRANT USAGE ON SCHEMA public,auth TO authenticated;',
'CREATE TABLE public.tenants(id uuid PRIMARY KEY,slug text UNIQUE);',
"CREATE TYPE public.app_role AS ENUM ('superadmin','centre_director','admissions_admin','employer_partner','student');",
'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
"CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid',true),'')::uuid $$;",
"CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT NULLIF(current_setting('test.tenant',true),'')::uuid $$;",
"CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles m WHERE m.user_id=u AND m.role=r AND (m.tenant_id IS NULL OR m.tenant_id=public.get_user_tenant_id(u))) $$;"
].join('\n'));
await db.query("INSERT INTO public.tenants(id,slug) VALUES($1,'unipathway'),($2,'other')",[T1,T2]);
// Reproduce older hosted defaults, including privileges that bypass row policies.
await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;');
await db.exec(employerActivationSql());
assert.equal((await db.query("SELECT to_regclass('public.unipathway_employer_memberships') AS relation")).rows[0].relation,null);checks++;
await db.exec(employerActivationSql(true));
for (const table of ['organisations','memberships','opportunities','applications']) {
 const name='public.unipathway_employer_'+table;
 for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
  assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS allowed',['anon',name,privilege])).rows[0].allowed,false);checks++;
 }
 for (const privilege of ['DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
  assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS allowed',['authenticated',name,privilege])).rows[0].allowed,false);checks++;
 }
}
for(const fn of ['unipathway_assert_employer_tenant()','unipathway_assert_employer_opportunity()','unipathway_guard_employer_application()']) {
 for(const role of ['anon','authenticated']) {
  assert.equal((await db.query('SELECT has_function_privilege($1,$2,$3) AS allowed',[role,'public.'+fn,'EXECUTE'])).rows[0].allowed,false);checks++;
 }
}
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,$2,'employer_partner'),($4,$2,'student'),($5,$6,'student'),($7,$2,'admissions_admin'),($8,$2,'student')",[DIRECTOR,T1,EMP,STUDENT,OTHER,T2,ADMISSIONS,SECOND_STUDENT]);
async function as(uid,tenant,fn){await db.exec('SET ROLE authenticated');await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);try{return await fn()}finally{await db.exec('RESET ROLE')}}
async function denied(fn){await assert.rejects(fn);checks++}
let org,opp,app;
await as(DIRECTOR,T1,async()=>{
 const o=await db.query("INSERT INTO public.unipathway_employer_organisations(tenant_id,name,sector,city) VALUES($1,'Demo Software Studio','Technology','Islamabad') RETURNING id,status",[T1]);
 org=o.rows[0].id;assert.equal(o.rows[0].status,'prospect');checks++;
 await denied(()=>db.query("UPDATE public.unipathway_employer_organisations SET status='verified' WHERE id=$1",[org]));
 const verified=await db.query("UPDATE public.unipathway_employer_organisations SET status='verified',verification_reference='PRIVATE-KYB-001',verified_by=$1,verified_at=now() WHERE id=$2 RETURNING status",[DIRECTOR,org]);assert.equal(verified.rows[0].status,'verified');checks++;
 const m=await db.query("INSERT INTO public.unipathway_employer_memberships(tenant_id,organisation_id,user_id,status,verified_by,verified_at,verification_reference) VALUES($1,$2,$3,'verified',$4,now(),'APPROVED-ID') RETURNING id",[T1,org,EMP,DIRECTOR]);assert.equal(m.rows.length,1);checks++;
});
await as(STUDENT,T1,async()=>{const x=await db.query('SELECT id FROM public.unipathway_employer_organisations');assert.equal(x.rows.length,0);checks++;});
await as(EMP,T1,async()=>{
 const a=await db.query("INSERT INTO public.unipathway_employer_opportunities(tenant_id,organisation_id,title,opportunity_type,role_description,created_by) VALUES($1,$2,'QA Internship','internship','Write and execute test plans',$3) RETURNING id,status",[T1,org,EMP]);opp=a.rows[0].id;assert.equal(a.rows[0].status,'draft');checks++;
 await denied(()=>db.query("UPDATE public.unipathway_employer_opportunities SET status='published' WHERE id=$1 RETURNING id",[opp]));
});
await as(ADMISSIONS,T1,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_opportunities');assert.equal(r.rows.length,1);checks++;
 const changed=await db.query("UPDATE public.unipathway_employer_opportunities SET status='published' WHERE id=$1 RETURNING id",[opp]);assert.equal(changed.rows.length,0,'Admissions cannot self-publish');checks++;
});
await as(DIRECTOR,T1,async()=>{
 await denied(()=>db.query("UPDATE public.unipathway_employer_opportunities SET status='published' WHERE id=$1",[opp]));
 const published=await db.query("UPDATE public.unipathway_employer_opportunities SET status='published',verification_reference='VACANCY-AGREEMENT-001',approved_by=$1,approved_at=now() WHERE id=$2 RETURNING status",[DIRECTOR,opp]);assert.equal(published.rows[0].status,'published');checks++;
});
await as(STUDENT,T1,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_opportunities');assert.equal(r.rows.length,1);checks++;
 const submitted=await db.query("INSERT INTO public.unipathway_employer_applications(tenant_id,opportunity_id,student_id,applicant_consent_at,statement) VALUES($1,$2,$3,now(),'I want to learn QA') RETURNING id,status",[T1,opp,STUDENT]);app=submitted.rows[0].id;assert.equal(submitted.rows[0].status,'submitted');checks++;
 await denied(()=>db.query("INSERT INTO public.unipathway_employer_applications(tenant_id,opportunity_id,student_id,applicant_consent_at) VALUES($1,$2,$3,now())",[T1,opp,OTHER]));
 await denied(()=>db.query("UPDATE public.unipathway_employer_applications SET student_id=$1,status='withdrawn' WHERE id=$2",[OTHER,app]));
});
await as(OTHER,T2,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_opportunities');assert.equal(r.rows.length,0);checks++;
 const apps=await db.query('SELECT id FROM public.unipathway_employer_applications');assert.equal(apps.rows.length,0);checks++;
});
await as(EMP,T1,async()=>{
 const apps=await db.query('SELECT id,student_id FROM public.unipathway_employer_applications');assert.equal(apps.rows.length,1);assert.equal(apps.rows[0].student_id,STUDENT);checks++;
 const unpublished=await db.query("UPDATE public.unipathway_employer_applications SET status='accepted' WHERE id=$1 RETURNING id",[app]);assert.equal(unpublished.rows.length,0,'Employer cannot secretly approve applicants');checks++;
});
// First prove that a dry run changes nothing: the pre-patch policy exposes
// submitted applicants to a verified employer (before a withdrawal).
await db.exec(employerPrivacySql());
await as(EMP,T1,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_applications');
 assert.equal(r.rows.length,1);checks++;
});
await db.exec(employerPrivacySql(true));
// Verify that direct API calls cannot manufacture successful offers without review.
let reviewed;
await as(SECOND_STUDENT,T1,async()=>{
 await assert.rejects(()=>db.query(
  "INSERT INTO public.unipathway_employer_applications(tenant_id,opportunity_id,student_id,applicant_consent_at,status) VALUES($1,$2,$3,now(),'accepted')",
  [T1,opp,SECOND_STUDENT]),/New applications must begin submitted/);checks++;
 const r=await db.query("INSERT INTO public.unipathway_employer_applications(tenant_id,opportunity_id,student_id,applicant_consent_at,statement) VALUES($1,$2,$3,now(),'Student-authored skills') RETURNING id",[T1,opp,SECOND_STUDENT]);
 reviewed=r.rows[0].id;
});
await as(DIRECTOR,T1,async()=>{
 await assert.rejects(()=>db.query("UPDATE public.unipathway_employer_applications SET status='accepted' WHERE id=$1",[reviewed]),/Invalid application status transition/);checks++;
 await assert.rejects(()=>db.query("UPDATE public.unipathway_employer_applications SET statement='Edited by director' WHERE id=$1",[reviewed]),/Application identity, statement and consent cannot be changed/);checks++;
 for(const stage of ['screening','shortlisted','accepted']){
  const r=await db.query("UPDATE public.unipathway_employer_applications SET status=$1 WHERE id=$2 RETURNING status",[stage,reviewed]);
  assert.equal(r.rows[0].status,stage);checks++;
 }
});
await as(EMP,T1,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_applications');
 assert.equal(r.rows.length,2,'An employer may view the explicitly consented accepted applicant');checks++;
});
await as(DIRECTOR,T1,async()=>{
 const r=await db.query("UPDATE public.unipathway_employer_applications SET status='withdrawn' WHERE id=$1 RETURNING status",[reviewed]);
 assert.equal(r.rows[0].status,'withdrawn','Centre can honour late-stage withdrawal requests');checks++;
});
await as(STUDENT,T1,async()=>{
 await denied(()=>db.query("UPDATE public.unipathway_employer_applications SET status='withdrawn', statement='Changed without renewed consent' WHERE id=$1",[app]));
 const withdrawn=await db.query("UPDATE public.unipathway_employer_applications SET status='withdrawn' WHERE id=$1 RETURNING status",[app]);assert.equal(withdrawn.rows[0].status,'withdrawn');checks++;
});
await as(EMP,T1,async()=>{
 const r=await db.query('SELECT id FROM public.unipathway_employer_applications');
 assert.equal(r.rows.length,0,'Withdrawn statements cannot remain visible to the employer');checks++;
});
await as(DIRECTOR,T1,async()=>{
 const audit=await db.query("SELECT status FROM public.unipathway_employer_applications WHERE id=$1",[app]);
 assert.equal(audit.rows[0].status,'withdrawn');checks++;
 await denied(()=>db.query("UPDATE public.unipathway_employer_applications SET status='accepted' WHERE id=$1",[app]));
});
let expired;
await as(EMP,T1,async()=>{
 const r=await db.query("INSERT INTO public.unipathway_employer_opportunities(tenant_id,organisation_id,title,opportunity_type,role_description,created_by,application_deadline) VALUES($1,$2,'Expired QA Role','internship','A supervised placement with a deadline that has passed',$3,CURRENT_DATE-INTERVAL '1 day') RETURNING id",[T1,org,EMP]);
 expired=r.rows[0].id;
});
await as(DIRECTOR,T1,async()=>{
 const r=await db.query("UPDATE public.unipathway_employer_opportunities SET status='published',verification_reference='VACANCY-AGREEMENT-EXPIRED',approved_by=$1,approved_at=now() WHERE id=$2 RETURNING id",[DIRECTOR,expired]);
 assert.equal(r.rows.length,1);checks++;
});
await as(STUDENT,T1,async()=>{
 await denied(()=>db.query("INSERT INTO public.unipathway_employer_applications(tenant_id,opportunity_id,student_id,applicant_consent_at) VALUES($1,$2,$3,now())",[T1,expired,STUDENT]));
});
await assert.rejects(()=>db.exec(employerActivationSql(true)),/already or partially installed/);checks++;
await db.exec('ROLLBACK');
assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.unipathway_employer_applications')).rows[0].n),2);checks++;
await db.close();
console.log('UniPathway employer partnership and placement RLS staging checks passed ('+checks+' assertions).');
