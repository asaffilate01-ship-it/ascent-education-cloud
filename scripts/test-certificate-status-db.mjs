// Synthetic public verification test; no real personal data or hosted access.
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const db=new PGlite();let checks=0;
try{
 await db.exec(`
 CREATE ROLE anon;CREATE ROLE authenticated;
 CREATE TABLE public.certificate_verifications(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,certificate_number text UNIQUE NOT NULL,student_name text NOT NULL,programme_title text NOT NULL,awarding_body text NOT NULL,level text NOT NULL,grade text,issue_date date NOT NULL,expiry_date date,status text NOT NULL,tenant_id uuid);
 CREATE FUNCTION public.verify_certificate(n text) RETURNS SETOF public.certificate_verifications LANGUAGE sql SECURITY DEFINER AS $$SELECT * FROM public.certificate_verifications WHERE certificate_number=n$$;
 GRANT USAGE ON SCHEMA public TO anon,authenticated;
 GRANT SELECT ON public.certificate_verifications TO anon;
 `);
 const tenant='00000000-0000-4000-8000-000000000001';
 const add=(n,status,issue,expiry,t=tenant)=>db.query("INSERT INTO public.certificate_verifications(certificate_number,student_name,programme_title,awarding_body,level,grade,issue_date,expiry_date,status,tenant_id) VALUES($1,'Synthetic name','Example course','Example body','4','Synthetic grade',$2,$3,$4,$5)",[n,issue,expiry,status,t]);
 await add('CERT-VALID','valid','2025-01-01',null);await add('CERT-REVOKED','revoked','2025-01-01',null);await add('CERT-EXPIRED','valid','2024-01-01','2025-01-01');
 await add('CERT-UNKNOWN','pending','2025-01-01',null);await add('CERT-FUTURE','valid','2099-01-01',null);await add('CERT-NO-CENTRE','valid','2025-01-01',null,null);await add('CERT-BAD-DATES','valid','2025-01-01','2024-01-01');await add('CERT-EXPIRED-FLAG','expired','2025-01-01',null);
 await db.exec(readFileSync('scripts/activation/unipathway-certificate-status-forward.sql','utf8'));
 async function actor(sql,args=[],role='anon'){await db.exec('SET ROLE '+role);try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}}
 const read=async(n,role='anon')=>(await actor('SELECT public.verify_unipathway_certificate_status($1) result',[n],role)).rows[0].result;
 for(const [n,status] of [['CERT-VALID','valid'],['CERT-REVOKED','revoked'],['CERT-EXPIRED','expired'],['CERT-UNKNOWN','review_required'],['CERT-FUTURE','review_required'],['CERT-NO-CENTRE','review_required'],['CERT-BAD-DATES','review_required'],['CERT-EXPIRED-FLAG','expired'],['CERT-MISSING','not_found']]){
  const result=await read(n);assert.equal(result.status,status);assert.deepEqual(Object.keys(result).sort(),['certificate_number','checked_on','status']);assert.equal(result.certificate_number,n);checks++;
 }
 assert.equal((await read(' cert-valid ','authenticated')).status,'valid');checks++;
 for(const role of ['anon','authenticated']){await assert.rejects(()=>actor('SELECT * FROM public.verify_certificate($1)',['CERT-VALID'],role));checks++;}
 await assert.rejects(()=>actor('SELECT * FROM public.certificate_verifications'));checks++;
 await assert.rejects(()=>read('CERT-%'));await assert.rejects(()=>read('A'.repeat(81)));checks+=2;
 console.log('Public certificate status: '+checks+' isolated privacy and status checks passed');
}finally{await db.close();}
