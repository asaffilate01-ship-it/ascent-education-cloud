import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001',T2='10000000-0000-0000-0000-000000000002';
const EXAM='20000000-0000-0000-0000-000000000001',STUDENT='20000000-0000-0000-0000-000000000002',OUTSIDE='20000000-0000-0000-0000-000000000003';
let checks=0;
await db.exec([
 'CREATE ROLE authenticated;',
 'CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;',
 'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
 "CREATE TYPE public.app_role AS ENUM('student','lecturer','exams_officer','programme_leader','centre_director','superadmin');",
 'CREATE TABLE public.tenants(id uuid PRIMARY KEY);',
 'CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);',
 'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t=nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u AND ur.tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND ur.role=r) $$;",
 "CREATE FUNCTION public.guard_ielts_learner_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id AND ur.tenant_id=p.tenant_id WHERE p.user_id=NEW.student_id AND p.tenant_id=NEW.tenant_id AND ur.role='student'::public.app_role) THEN RAISE EXCEPTION 'Invalid learner' USING ERRCODE='42501'; END IF;RETURN NEW; END $$;"
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261017202500_ielts_mock_rehearsals.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[T,T2]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[EXAM,STUDENT,OUTSIDE]);
await db.query('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2),($3,$2),($4,$5)',[EXAM,T,STUDENT,OUTSIDE,T2]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'exams_officer'),($3,$2,'student'),($4,$5,'student')",[EXAM,T,STUDENT,OUTSIDE,T2]);
async function as(uid,tenant,fn){await db.exec('SET ROLE authenticated;');await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[uid,tenant]);try{return await fn();}finally{await db.exec('RESET ROLE;');}}
async function denied(fn){await assert.rejects(fn);checks++;}
await as(STUDENT,T,async()=>{
 await denied(()=>db.query("INSERT INTO public.ielts_mock_rehearsals(tenant_id,student_id,track,rehearsal_type,delivery,scheduled_at,assigned_by) VALUES($1,$2,'academic','short_practice','online',now(),$2)",[T,STUDENT]));
});
const id=await as(EXAM,T,async()=>{
 const r=await db.query("INSERT INTO public.ielts_mock_rehearsals(tenant_id,student_id,track,rehearsal_type,delivery,scheduled_at,assigned_by) VALUES($1,$2,'academic','full_rehearsal','centre',now()+interval '1 day',$3) RETURNING id,assigned_by,status",[T,STUDENT,OUTSIDE]);
 assert.equal(r.rows[0].assigned_by,EXAM);assert.equal(r.rows[0].status,'scheduled');checks++;
 return r.rows[0].id;
});
await as(STUDENT,T,async()=>{
 const row=await db.query('SELECT id,status FROM public.ielts_mock_rehearsals WHERE id=$1',[id]);
 assert.equal(row.rows.length,1);checks++;
 const noUpdate=await db.query("UPDATE public.ielts_mock_rehearsals SET status='in_progress' WHERE id=$1 RETURNING id",[id]);
 assert.equal(noUpdate.rows.length,0);checks++;
});
await as(EXAM,T,async()=>{
 await denied(()=>db.query("UPDATE public.ielts_mock_rehearsals SET status='reviewed' WHERE id=$1",[id]));
 const start=await db.query("UPDATE public.ielts_mock_rehearsals SET status='in_progress' WHERE id=$1 RETURNING id",[id]);
 assert.equal(start.rows.length,1);checks++;
 await denied(()=>db.query("UPDATE public.ielts_mock_rehearsals SET status='reviewed',listening_questions=6,listening_correct=5,reading_questions=6,reading_correct=4,tutor_next_steps='Revisit timing.' WHERE id=$1",[id]));
 const r=await db.query("UPDATE public.ielts_mock_rehearsals SET status='reviewed',listening_questions=40,listening_correct=31,reading_questions=40,reading_correct=27,writing_observations='Tutor assessed a supervised full writing response.',speaking_observations='Live interview observed across three sections.',tutor_next_steps='Prioritise paraphrase, essay organisation and pronunciation.' WHERE id=$1 RETURNING assessed_by,assessed_at",[id]);
 assert.equal(r.rows[0].assessed_by,EXAM);assert.ok(r.rows[0].assessed_at);checks++;
 await denied(()=>db.query("UPDATE public.ielts_mock_rehearsals SET status='in_progress' WHERE id=$1",[id]));
 await denied(()=>db.query("UPDATE public.ielts_mock_rehearsals SET reading_correct=39 WHERE id=$1",[id]));
});
await as(OUTSIDE,T2,async()=>{
 const seen=await db.query('SELECT id FROM public.ielts_mock_rehearsals');
 assert.equal(seen.rows.length,0);checks++;
});
await db.close();
console.log('IELTS mock operations tests passed ('+checks+' checks).');
