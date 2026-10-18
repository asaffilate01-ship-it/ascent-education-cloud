import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001';
const OTHER='10000000-0000-0000-0000-000000000002';
const S='20000000-0000-0000-0000-000000000001';
const O='20000000-0000-0000-0000-000000000002';
const TEACHER='20000000-0000-0000-0000-000000000003';
const SOUND='30000000-0000-0000-0000-000000000001';
const path=T+'/'+S+'/'+SOUND+'.webm';
let checks=0;
await db.exec([
 "CREATE ROLE authenticated;",
 "CREATE SCHEMA auth;CREATE SCHEMA storage;",
 "GRANT USAGE ON SCHEMA auth,storage TO authenticated;",
 "CREATE TABLE auth.users(id uuid PRIMARY KEY);",
 "CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
 "CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL REFERENCES storage.buckets(id),name text NOT NULL,UNIQUE(bucket_id,name));",
 "GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;",
 "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;",
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','programme_leader','centre_director','superadmin');",
 "CREATE TABLE public.tenants(id uuid PRIMARY KEY);",
 "CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);",
 "CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);",
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND role=r) $$;",
 "CREATE FUNCTION public.guard_ielts_learner_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id WHERE p.user_id=NEW.student_id AND p.tenant_id=NEW.tenant_id AND r.role='student'::public.app_role) THEN RAISE EXCEPTION 'Student outside centre' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;"
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017192500_ielts_speaking_evidence.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,OTHER]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[S,O,TEACHER]);
await db.query('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2),($3,$4),($5,$2)',[S,T,O,OTHER,TEACHER]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'student'),($3,$4,'student'),($5,$2,'lecturer')",[S,T,O,OTHER,TEACHER]);
async function as(uid,tenant,fn){
 await db.exec('SET ROLE authenticated;');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await fn();}finally{await db.exec('RESET ROLE;');}
}
async function denied(fn){await assert.rejects(fn);checks++;}
await as(S,T,async()=>{
 const allowed=await db.query('SELECT public.can_access_ielts_speaking($1,true) AS permitted',[path]);
 assert.equal(allowed.rows[0].permitted,true);checks++;
 await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('ielts-speaking',$1)",[path]);checks++;
 await denied(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('ielts-speaking',$1)",[OTHER+'/'+O+'/'+SOUND+'.webm']));
 await denied(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('ielts-speaking',$1)",[T+'/'+S+'/'+SOUND+'.pdf']));
 await denied(()=>db.query("INSERT INTO public.ielts_speaking_recordings(tenant_id,student_id,track,prompt_key,storage_path,mime_type,duration_seconds,consent_at,teacher_feedback) VALUES($1,$2,'academic','part2',$3,'audio/webm',30,now(),'Forged tutor feedback')",[T,S,path]));
 const r=await db.query("INSERT INTO public.ielts_speaking_recordings(tenant_id,student_id,track,prompt_key,storage_path,mime_type,duration_seconds,consent_at) VALUES($1,$2,'academic','part2',$3,'audio/webm',30,now()) RETURNING id",[T,S,path]);
 assert.equal(r.rows.length,1);checks++;
});
await as(TEACHER,T,async()=>{
 const allowed=await db.query('SELECT public.can_access_ielts_speaking($1,false) AS reading,public.can_access_ielts_speaking($1,true) AS writing',[path]);
 assert.equal(allowed.rows[0].reading,true);assert.equal(allowed.rows[0].writing,false);checks++;
 const records=await db.query("SELECT id FROM public.ielts_speaking_recordings WHERE storage_path=$1",[path]);
 assert.equal(records.rows.length,1);checks++;
 await denied(()=>db.query("UPDATE public.ielts_speaking_recordings SET student_id=$1 WHERE storage_path=$2",[O,path]));
 await denied(()=>db.query("UPDATE public.ielts_speaking_recordings SET fluency_band=6.5 WHERE storage_path=$1",[path]));
 const review=await db.query("UPDATE public.ielts_speaking_recordings SET teacher_feedback='Pronunciation is clear; develop transitions and stress patterns.',fluency_band=6.5,lexical_band=6,grammar_band=6.5,pronunciation_band=7 WHERE storage_path=$1 RETURNING reviewed_by,reviewed_at",[path]);
 assert.equal(review.rows[0].reviewed_by,TEACHER);assert.ok(review.rows[0].reviewed_at);checks++;
 await denied(()=>db.query("UPDATE public.ielts_speaking_recordings SET pronunciation_band=7.3 WHERE storage_path=$1",[path]));
 const count=await db.query("SELECT count(*)::int AS n FROM storage.objects WHERE name=$1",[path]);
 assert.equal(count.rows[0].n,1);checks++;
});
await as(O,OTHER,async()=>{
 const privateDb=await db.query('SELECT id FROM public.ielts_speaking_recordings');
 assert.equal(privateDb.rows.length,0);checks++;
 const privateMedia=await db.query("SELECT name FROM storage.objects WHERE bucket_id='ielts-speaking'");
 assert.equal(privateMedia.rows.length,0);checks++;
 const notDeleted=await db.query("DELETE FROM storage.objects WHERE bucket_id='ielts-speaking' AND name=$1 RETURNING id",[path]);
 assert.equal(notDeleted.rows.length,0);checks++;
});
await as(S,T,async()=>{
 const r=await db.query('SELECT teacher_feedback FROM public.ielts_speaking_recordings WHERE storage_path=$1',[path]);
 assert.match(r.rows[0].teacher_feedback,/Pronunciation/);checks++;
 const cleared=await db.query("DELETE FROM storage.objects WHERE bucket_id='ielts-speaking' AND name=$1 RETURNING id",[path]);
 assert.equal(cleared.rows.length,1);checks++;
 const done=await db.query("DELETE FROM public.ielts_speaking_recordings WHERE storage_path=$1 RETURNING id",[path]);
 assert.equal(done.rows.length,1);checks++;
});
await db.close();
console.log('IELTS private Speaking storage and tutor RLS tests passed ('+checks+' checks).');
