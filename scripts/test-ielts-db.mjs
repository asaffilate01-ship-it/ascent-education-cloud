import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const CENTRE='10000000-0000-0000-0000-000000000001';
const OTHER='10000000-0000-0000-0000-000000000002';
const LEARNER='20000000-0000-0000-0000-000000000001';
const OUTSIDER='20000000-0000-0000-0000-000000000002';
const TUTOR='20000000-0000-0000-0000-000000000003';
let checks=0;
await db.exec(`
 CREATE ROLE authenticated;
 CREATE SCHEMA auth;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','programme_leader','superadmin');
 CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.uid',true),'')::uuid
 $$;
 CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT t = nullif(current_setting('test.tenant',true),'')::uuid
 $$;
 CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u
    AND tenant_id=nullif(current_setting('test.tenant',true),'')::uuid AND role=r)
 $$;
`);
await db.exec(readFileSync('supabase/migrations/20261017150000_ielts_academy.sql','utf8'));
await db.query('INSERT INTO public.tenants(id) VALUES($1),($2)',[CENTRE,OTHER]);
await db.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[LEARNER,OUTSIDER,TUTOR]);
await db.query('INSERT INTO public.profiles(user_id,tenant_id) VALUES($1,$2),($3,$4),($5,$2)',[LEARNER,CENTRE,OUTSIDER,OTHER,TUTOR]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES($1,$2,'student'),($3,$4,'student'),($5,$2,'lecturer')",[LEARNER,CENTRE,OUTSIDER,OTHER,TUTOR]);

async function as(uid,tenant,callback){
 await db.exec('SET ROLE authenticated;');
 await db.query("SELECT set_config('test.uid',$1,false), set_config('test.tenant',$2,false)",[uid,tenant]);
 try{return await callback();}finally{await db.exec('RESET ROLE;');}
}
async function expectDenied(fn){
 await assert.rejects(fn);checks++;
}
const planId=await as(LEARNER,CENTRE,async()=>{
 const v=await db.query("INSERT INTO public.ielts_study_plans(tenant_id,student_id,track,target_band) VALUES($1,$2,'academic',6.5) RETURNING id",[CENTRE,LEARNER]);
 assert.equal(v.rows.length,1);checks++;
 return v.rows[0].id;
});
await as(LEARNER,CENTRE,async()=>{
 const v=await db.query("SELECT * FROM public.ielts_study_plans WHERE id=$1",[planId]);
 assert.equal(v.rows.length,1);checks++;
 await expectDenied(()=>db.query("INSERT INTO public.ielts_study_plans(tenant_id,student_id,track) VALUES($1,$2,'general')",[CENTRE,OUTSIDER]));
 await expectDenied(()=>db.query("INSERT INTO public.ielts_practice_submissions(tenant_id,student_id,track,unit_week,skill,answer_text,teacher_band,teacher_feedback) VALUES($1,$2,'academic',4,'writing','A student attempt for marking',8,'Self awarded')",[CENTRE,LEARNER]));
});
const practiceId=await as(LEARNER,CENTRE,async()=>{
 const v=await db.query("INSERT INTO public.ielts_practice_submissions(tenant_id,student_id,track,unit_week,skill,answer_text) VALUES($1,$2,'academic',4,'writing','A full original practice response with enough words for review') RETURNING id",[CENTRE,LEARNER]);
 assert.equal(v.rows.length,1);checks++;
 await db.query("INSERT INTO public.ielts_unit_completions(tenant_id,student_id,track,unit_week) VALUES($1,$2,'academic',4),($1,$2,'general',4)",[CENTRE,LEARNER]);
 const t=await db.query("SELECT count(*)::int AS n FROM public.ielts_unit_completions WHERE student_id=$1",[LEARNER]);
 assert.equal(t.rows[0].n,2);checks++;
 return v.rows[0].id;
});
const readingId=await as(LEARNER,CENTRE,async()=>{
 const v=await db.query("INSERT INTO public.ielts_practice_submissions(tenant_id,student_id,track,unit_week,skill,answer_text) VALUES($1,$2,'academic',3,'reading','Micro-drill reading summary, not an IELTS band') RETURNING id",[CENTRE,LEARNER]);
 assert.equal(v.rows.length,1);checks++;
 return v.rows[0].id;
});
await as(TUTOR,CENTRE,async()=>{
 const v=await db.query("UPDATE public.ielts_practice_submissions SET teacher_band=6.5,teacher_feedback='Develop the overview and compare the main trends.' WHERE id=$1 RETURNING reviewed_by,reviewed_at",[practiceId]);
 assert.equal(v.rows[0].reviewed_by,TUTOR);assert.ok(v.rows[0].reviewed_at);checks++;
 await expectDenied(()=>db.query("UPDATE public.ielts_practice_submissions SET teacher_band=7,teacher_feedback='Not a Writing score' WHERE id=$1",[readingId]));
 const narrative=await db.query("UPDATE public.ielts_practice_submissions SET teacher_feedback='Review the specific passage evidence before answering.' WHERE id=$1 RETURNING reviewed_by,reviewed_at",[readingId]);
 assert.equal(narrative.rows[0].reviewed_by,TUTOR);assert.ok(narrative.rows[0].reviewed_at);checks++;
 await expectDenied(()=>db.query("UPDATE public.ielts_practice_submissions SET answer_text='Changed by teacher' WHERE id=$1",[practiceId]));
 await expectDenied(()=>db.query("INSERT INTO public.ielts_practice_submissions(tenant_id,student_id,track,unit_week,skill,answer_text) VALUES($1,$2,'academic',5,'writing','Tutor must not impersonate the learner')",[CENTRE,LEARNER]));
});
await as(LEARNER,CENTRE,async()=>{
 const v=await db.query("SELECT teacher_band,teacher_feedback FROM public.ielts_practice_submissions WHERE id=$1",[practiceId]);
 assert.equal(Number(v.rows[0].teacher_band),6.5);checks++;
 const deniedUpdate=await db.query("UPDATE public.ielts_practice_submissions SET teacher_band=9 WHERE id=$1 RETURNING id",[practiceId]);
 assert.equal(deniedUpdate.rows.length,0,'RLS must prevent student grade writes');checks++;
 const unchanged=await db.query("SELECT teacher_band FROM public.ielts_practice_submissions WHERE id=$1",[practiceId]);
 assert.equal(Number(unchanged.rows[0].teacher_band),6.5);checks++;
});
await as(OUTSIDER,OTHER,async()=>{
 const a=await db.query("SELECT id FROM public.ielts_practice_submissions");
 assert.equal(a.rows.length,0);checks++;
 await expectDenied(()=>db.query("INSERT INTO public.ielts_unit_completions(tenant_id,student_id,track,unit_week) VALUES($1,$2,'academic',2)",[CENTRE,OUTSIDER]));
});
await db.close();
console.log('IELTS schema, grade integrity and cross-tenant tests passed ('+checks+' checks).');
