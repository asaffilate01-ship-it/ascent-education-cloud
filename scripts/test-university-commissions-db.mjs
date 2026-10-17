import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001',T2='10000000-0000-0000-0000-000000000002';
const F='20000000-0000-0000-0000-000000000001',STUDENT='20000000-0000-0000-0000-000000000002',OUT='20000000-0000-0000-0000-000000000003';
const PARTNER='30000000-0000-0000-0000-000000000001',AGREEMENT='30000000-0000-0000-0000-000000000002';
const REF='40000000-0000-0000-0000-000000000001',UNSIGNED='40000000-0000-0000-0000-000000000002';
let checks=0;
await db.exec([
 'CREATE ROLE authenticated;',
 'CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;',
 'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
 "CREATE TYPE public.app_role AS ENUM('student','finance_officer','centre_director','superadmin');",
 'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
 'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND role=r) $$;",
 'CREATE TABLE public.international_partner_agreements(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,partner_id uuid NOT NULL,status text NOT NULL,document_reference text,starts_on date,ends_on date,commission_currency text,commission_amount numeric,commission_basis text);',
 'CREATE TABLE public.international_partner_referrals(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,partner_id uuid NOT NULL,status text,student_consent_at timestamptz,external_application_ref text);'
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017205000_verified_university_commission_claims.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,T2]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[F,STUDENT,OUT]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'finance_officer'),($3,$2,'student'),($4,$5,'student')",[F,T,STUDENT,OUT,T2]);
await db.query("INSERT INTO public.international_partner_agreements(id,tenant_id,partner_id,status,document_reference,starts_on,commission_currency,commission_amount,commission_basis) VALUES($1,$2,$3,'signed','AGREEMENT-001',current_date-10,'GBP',12,'percentage_of_tuition')",[AGREEMENT,T,PARTNER]);
await db.query("INSERT INTO public.international_partner_referrals(id,tenant_id,partner_id,status,student_consent_at,external_application_ref) VALUES($1,$2,$3,'enrolled',now(),'UNI-APP-128'),($4,$2,$3,'draft',NULL,NULL)",[REF,T,PARTNER,UNSIGNED]);
async function as(uid,tenant,fn){await db.exec('SET ROLE authenticated;');await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);try{return await fn();}finally{await db.exec('RESET ROLE;');}}
async function denied(fn){await assert.rejects(fn);checks++;}
await as(STUDENT,T,async()=>{
 await denied(()=>db.query("INSERT INTO public.university_commission_claims(tenant_id,referral_id,agreement_id,enrolment_confirmed_on,tuition_amount,commission_currency,commission_due,created_by) VALUES($1,$2,$3,current_date,10000,'GBP',1,$4)",[T,REF,AGREEMENT,STUDENT]));
 const visible=await db.query('SELECT id FROM public.university_commission_claims');assert.equal(visible.rows.length,0);checks++;
});
const claim=await as(F,T,async()=>{
 await denied(()=>db.query("INSERT INTO public.university_commission_claims(tenant_id,referral_id,agreement_id,enrolment_confirmed_on,tuition_amount,commission_currency,commission_due,created_by) VALUES($1,$2,$3,current_date,10000,'GBP',1,$4)",[T,UNSIGNED,AGREEMENT,F]));
 const r=await db.query("INSERT INTO public.university_commission_claims(tenant_id,referral_id,agreement_id,enrolment_confirmed_on,tuition_amount,commission_currency,commission_due,created_by) VALUES($1,$2,$3,current_date,10000,'USD',1,$4) RETURNING id,commission_currency,commission_due,created_by,status",[T,REF,AGREEMENT,STUDENT]);
 assert.equal(r.rows[0].commission_currency,'GBP');assert.equal(Number(r.rows[0].commission_due),1200);
 assert.equal(r.rows[0].created_by,F);assert.equal(r.rows[0].status,'draft');checks++;
 return r.rows[0].id;
});
await as(F,T,async()=>{
 await denied(()=>db.query("UPDATE public.university_commission_claims SET status='received' WHERE id=$1",[claim]));
 const proof=await db.query("UPDATE public.university_commission_claims SET status='verified',university_enrolment_evidence='University tuition & enrolment confirmation REF004' WHERE id=$1 RETURNING reviewed_by,verified_at",[claim]);
 assert.equal(proof.rows[0].reviewed_by,F);assert.ok(proof.rows[0].verified_at);checks++;
 await denied(()=>db.query("UPDATE public.university_commission_claims SET university_enrolment_evidence='Replaced after review' WHERE id=$1",[claim]));
 const inv=await db.query("UPDATE public.university_commission_claims SET status='invoiced',invoice_reference='INV-1092' WHERE id=$1 RETURNING invoiced_at",[claim]);
 assert.ok(inv.rows[0].invoiced_at);checks++;
 await denied(()=>db.query("UPDATE public.university_commission_claims SET status='received',receipt_reference='BANK-120',received_amount=2 WHERE id=$1",[claim]));
 const received=await db.query("UPDATE public.university_commission_claims SET status='received',receipt_reference='BANK-120' WHERE id=$1 RETURNING received_amount,received_on",[claim]);
 assert.equal(Number(received.rows[0].received_amount),1200);assert.ok(received.rows[0].received_on);checks++;
 await denied(()=>db.query("UPDATE public.university_commission_claims SET status='draft' WHERE id=$1",[claim]));
 const reversed=await db.query("UPDATE public.university_commission_claims SET status='reversed',reversal_reference='CRN-002' WHERE id=$1 RETURNING id",[claim]);
 assert.equal(reversed.rows[0].id,claim);checks++;
 const events=await db.query("SELECT to_status FROM public.university_commission_claim_events WHERE claim_id=$1 ORDER BY occurred_at,id",[claim]);
 assert.equal(events.rows.length,5);checks++;
});
await as(OUT,T2,async()=>{
 const r=await db.query('SELECT id FROM public.university_commission_claims');
 assert.equal(r.rows.length,0);checks++;
 const h=await db.query('SELECT claim_id FROM public.university_commission_claim_events');
 assert.equal(h.rows.length,0);checks++;
});
await db.close();
console.log('Verified university commission claim and accounting evidence tests passed ('+checks+' checks).');
