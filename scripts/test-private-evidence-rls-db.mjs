// Synthetic database only: verify the actual forward SQL with two centres and legacy permissive policies.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let checks=0;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),b=id(2),a=id(10),peer=id(11),foreign=id(12),director=id(13),otherDirector=id(14),finance=id(15),wrongRole=id(16),lecturer=id(17),owner=id(18),admissions=id(19);
const path=u=>u+'/identity.pdf';
const row=(u,tenant,p=path(u),status='pending')=>[u,tenant,p,status];
const migration=readFileSync('scripts/activation/unipathway-private-evidence-forward.sql','utf8');
try{
 await db.exec(`
 CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role text);
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 CREATE TABLE public.kyc_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,tenant_id uuid,document_type text NOT NULL,file_url text,file_name text,status text NOT NULL DEFAULT 'pending',verified_by uuid,verified_at timestamptz,rejection_reason text,expiry_date date,metadata jsonb DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,UNIQUE(bucket_id,name));
 CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean,file_size_limit bigint);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon;
 GRANT ALL ON public.kyc_documents,storage.objects TO authenticated,anon;
 CREATE POLICY "Legacy broad metadata" ON public.kyc_documents FOR ALL TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY "Legacy broad objects" ON storage.objects FOR ALL TO authenticated,anon USING(true) WITH CHECK(true);
 INSERT INTO storage.buckets VALUES('kyc-documents',true,NULL),('other-bucket',true,NULL);
 `);
 for(const [uid,tenant,role,roleTenant] of [[a,t,'student',t],[peer,t,'student',t],[foreign,b,'student',b],[director,t,'centre_director',t],[otherDirector,b,'centre_director',b],[finance,t,'finance_officer',t],[wrongRole,t,'centre_director',b],[lecturer,t,'lecturer',t],[owner,t,'superadmin',null],[admissions,t,'admissions_admin',t]]){
  await db.query('INSERT INTO public.profiles VALUES($1,$2)',[uid,tenant]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[uid,roleTenant,role]);
 }
 await db.exec(migration);await db.exec(migration); // deliberate idempotence rehearsal
 async function actor(uid,statement,params=[],role='authenticated'){await db.query("select set_config('test.uid',$1,false)",[uid||'']);await db.exec('SET ROLE '+role);try{return await db.query(statement,params);}finally{await db.exec('RESET ROLE');}}
 async function denied(fn){await assert.rejects(fn);checks++;}
 async function count(uid,statement,params=[],n,role='authenticated'){const result=await actor(uid,statement,params,role);assert.equal(result.rows.length,n);checks++;}
 const insert='INSERT INTO public.kyc_documents(user_id,tenant_id,document_type,file_url,file_name,status) VALUES($1,$2,\'passport\',$3,\'identity.pdf\',$4) RETURNING id';
 const upload=(u,p=path(u),bucket='kyc-documents')=>actor(u,'INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',[bucket,p]);
 const view='SELECT id FROM public.kyc_documents';
 const objects="SELECT id FROM storage.objects WHERE bucket_id='kyc-documents'";
 for(const [u,tenant] of [[a,t],[peer,t],[foreign,b],[lecturer,t]]){
  await upload(u);const r=await actor(u,insert,row(u,tenant));assert.equal(r.rows.length,1);checks++;
 }
 await denied(()=>upload(a,path(peer)));await denied(()=>upload(finance));await denied(()=>upload(a,a+'/nested/x.pdf'));await denied(()=>upload(a,a+'/..'));await denied(()=>actor(null,'INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',['kyc-documents',path(finance)],'anon'));
 await denied(()=>actor(a,insert,row(a,b)));await denied(()=>actor(a,insert,row(peer,t,path(a))));await denied(()=>actor(a,insert,row(a,null)));await denied(()=>actor(a,insert,row(a,t,a+'/not-uploaded.pdf')));await denied(()=>actor(a,insert,row(a,t,path(a),'verified')));
 await denied(()=>actor(a,'INSERT INTO public.kyc_documents(user_id,tenant_id,document_type,file_url,file_name,status,verified_by) VALUES($1,$2,\'passport\',$3,\'identity.pdf\',\'pending\',$1)',[a,t,path(a)]));
 for(const [u,n] of [[a,1],[peer,1],[foreign,1],[director,3],[otherDirector,1],[finance,0],[wrongRole,0],[lecturer,1],[owner,3],[admissions,3]]){await count(u,view,[],n);await count(u,objects,[],n);}
 await denied(()=>actor(null,view,[],'anon'));await count(null,objects,[],0,'anon');
 await upload(a,a+'/unlinked.pdf');await count(a,objects,[],1);await count(director,objects,[],3);
 await count(a,"UPDATE public.kyc_documents SET status='verified',verified_by=$1,verified_at=now() WHERE user_id=$1 RETURNING id",[a],0);
 await denied(()=>actor(director,"UPDATE public.kyc_documents SET status='verified' WHERE user_id=$1",[a]));
 await count(director,"UPDATE public.kyc_documents SET status='verified',verified_by=$1,verified_at=now() WHERE user_id=$2 RETURNING id",[director,a],1);
 await count(otherDirector,"UPDATE public.kyc_documents SET status='expired' WHERE user_id=$1 RETURNING id",[a],0);
 await denied(()=>actor(director,'UPDATE public.kyc_documents SET tenant_id=$1 WHERE user_id=$2',[b,a]));
 await denied(()=>actor(director,'UPDATE public.kyc_documents SET file_url=$1 WHERE user_id=$2',[path(foreign),a]));
 await denied(()=>actor(a,'DELETE FROM public.kyc_documents WHERE user_id=$1',[a]));
 await count(a,"DELETE FROM storage.objects WHERE bucket_id='kyc-documents' RETURNING id",[],0);
 await count(director,"UPDATE storage.objects SET name='overwrite' WHERE bucket_id='kyc-documents' RETURNING id",[],0);
 await upload(director);await actor(director,insert,row(director,t));await count(director,"UPDATE public.kyc_documents SET status='verified',verified_by=$1,verified_at=now() WHERE user_id=$1 RETURNING id",[director],0);
 await upload(a,'other-object','other-bucket');await count(a,"SELECT id FROM storage.objects WHERE bucket_id='other-bucket'",[],1);await count(null,"SELECT id FROM storage.objects WHERE bucket_id='other-bucket'",[],1,'anon');
 const bucket=(await db.query("SELECT public,file_size_limit FROM storage.buckets WHERE id='kyc-documents'")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),20971520);checks++;
 console.log('Private KYC evidence: '+checks+' synthetic checks passed (no hosted database access).');
}finally{await db.close();}
