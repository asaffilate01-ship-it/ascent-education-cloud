import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001',OTHER='10000000-0000-0000-0000-000000000002';
const MANAGER='20000000-0000-0000-0000-000000000001',LECTURER='20000000-0000-0000-0000-000000000002';
const STUDENT='20000000-0000-0000-0000-000000000003',OUTSIDER='20000000-0000-0000-0000-000000000004';
let checks=0;
await db.exec([
 'CREATE ROLE authenticated;',
 'CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;',
 'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','superadmin','admissions_admin');",
 'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
 'CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);',
 'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,needed public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles x WHERE x.user_id=u AND x.tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND x.role=needed) $$;"
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017204000_staff_and_partner_readiness.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,OTHER]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3),($4)',[MANAGER,LECTURER,STUDENT,OUTSIDER]);
await db.query('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2),($3,$2),($4,$2),($5,$6)',[MANAGER,T,LECTURER,STUDENT,OUTSIDER,OTHER]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'centre_director'),($3,$2,'lecturer'),($4,$2,'student'),($5,$6,'student')",[MANAGER,T,LECTURER,STUDENT,OUTSIDER,OTHER]);
async function as(uid,tenant,fn){await db.exec('SET ROLE authenticated;');await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);try{return await fn();}finally{await db.exec('RESET ROLE;');}}
async function denied(fn){await assert.rejects(fn);checks++;}
let credential;
await as(MANAGER,T,async()=>{
 await denied(()=>db.query("INSERT INTO public.education_staff_credentials(tenant_id,staff_id,credential_name,provider_name) VALUES($1,$2,'CELTA English teacher qualification','Cambridge English')",[T,STUDENT]));
 await denied(()=>db.query("INSERT INTO public.education_staff_credentials(tenant_id,staff_id,credential_name,provider_name) VALUES($1,$2,'CELTA English teacher qualification','Cambridge English')",[T,OUTSIDER]));
 const r=await db.query("INSERT INTO public.education_staff_credentials(tenant_id,staff_id,credential_name,provider_name,evidence_reference) VALUES($1,$2,'CELTA English teacher qualification','Cambridge English','STAFF_DOC_32') RETURNING id,status",[T,LECTURER]);
 credential=r.rows[0].id;assert.equal(r.rows[0].status,'unverified');checks++;
 const reviewed=await db.query("UPDATE public.education_staff_credentials SET status='reviewed' WHERE id=$1 RETURNING verified_by",[credential]);
 assert.equal(reviewed.rows[0].verified_by,MANAGER);checks++;
 const changed=await db.query("UPDATE public.education_staff_credentials SET credential_number='XX-32' WHERE id=$1 RETURNING status",[credential]);
 assert.equal(changed.rows[0].status,'unverified');checks++;
});
await as(LECTURER,T,async()=>{
 const r=await db.query('SELECT id FROM public.education_staff_credentials');assert.equal(r.rows.length,1);checks++;
 const blocked=await db.query("UPDATE public.education_staff_credentials SET status='reviewed' WHERE id=$1 RETURNING id",[credential]);
 assert.equal(blocked.rows.length,0,'RLS must block lecturer approval');checks++;
});
await as(STUDENT,T,async()=>{
 const r=await db.query('SELECT id FROM public.education_staff_credentials');assert.equal(r.rows.length,0);checks++;
});
let partner;
await as(MANAGER,T,async()=>{
 const r=await db.query("INSERT INTO public.education_partner_applications(tenant_id,organisation_name,country,programme) VALUES($1,'Example University','UK','university_recruitment_agent') RETURNING id,stage",[T]);
 partner=r.rows[0].id;assert.equal(r.rows[0].stage,'research');checks++;
 await denied(()=>db.query("UPDATE public.education_partner_applications SET stage='approved' WHERE id=$1",[partner]));
 await db.query("UPDATE public.education_partner_applications SET stage='contacted' WHERE id=$1",[partner]);
 await db.query("UPDATE public.education_partner_applications SET stage='submitted' WHERE id=$1",[partner]);
 await db.query("UPDATE public.education_partner_applications SET stage='due_diligence' WHERE id=$1",[partner]);
 const accepted=await db.query("UPDATE public.education_partner_applications SET stage='approved',approval_reference='SIGNED_AGENCY_DOC_2026' WHERE id=$1 RETURNING approval_verified_by,approval_verified_at",[partner]);
 assert.equal(accepted.rows[0].approval_verified_by,MANAGER);assert.ok(accepted.rows[0].approval_verified_at);checks++;
});
await as(OUTSIDER,OTHER,async()=>{
 const c=await db.query('SELECT id FROM public.education_staff_credentials');
 const p=await db.query('SELECT id FROM public.education_partner_applications');
 assert.equal(c.rows.length,0);assert.equal(p.rows.length,0);checks++;
});
await db.close();
console.log('Staff and third-party partnership approval staging tests passed ('+checks+' checks).');
