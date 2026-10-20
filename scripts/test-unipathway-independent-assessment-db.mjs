import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const db=new PGlite();
const T='10000000-0000-0000-0000-000000000001',T2='10000000-0000-0000-0000-000000000002';
const L='20000000-0000-0000-0000-000000000001',M='20000000-0000-0000-0000-000000000002';
const S='20000000-0000-0000-0000-000000000003',S2='20000000-0000-0000-0000-000000000004';
const MARK='20000000-0000-0000-0000-000000000005',QA='20000000-0000-0000-0000-000000000006';
const OUT='20000000-0000-0000-0000-000000000007';
const MOD='30000000-0000-0000-0000-000000000001',PROG='40000000-0000-0000-0000-000000000001';
let checks=0;
async function denied(fn,pattern){await assert.rejects(fn,pattern);checks++;}
await db.exec([
 'CREATE ROLE authenticated; CREATE ROLE anon;',
 'CREATE SCHEMA auth; GRANT USAGE ON SCHEMA public,auth TO authenticated;',
 "CREATE TYPE public.app_role AS ENUM ('superadmin','centre_director','programme_leader','lecturer','assessor','iqa_officer','student');",
 'CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);',
 'CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid,title text);',
 'CREATE TABLE public.student_enrolments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,programme_id uuid,student_id uuid,status text);',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;",
 "CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT nullif(current_setting('test.tenant',true),'')::uuid $$;",
 "CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles m WHERE m.user_id=u AND m.role=r AND (m.tenant_id IS NULL OR m.tenant_id=public.get_user_tenant_id(u))) $$;",
 "CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT t=public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(),'superadmin'::public.app_role) $$;",
].join('\n'));
await db.exec(readFileSync('supabase/migrations/20261020150000_unipathway_independent_assessment.sql','utf8'));
await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;');
await db.query("INSERT INTO public.modules(id,tenant_id,programme_id,lecturer_id,title) VALUES($1,$2,$3,$4,'Physics')",[MOD,T,PROG,L]);
await db.query("INSERT INTO public.student_enrolments(tenant_id,programme_id,student_id,status) VALUES($1,$2,$3,'active'),($1,$2,$4,'active')",[T,PROG,S,S2]);
await db.query("INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES ($1,$2,'lecturer'),($3,$2,'programme_leader'),($4,$2,'student'),($5,$2,'student'),($6,$2,'assessor'),($7,$2,'iqa_officer'),($8,$9,'student')",[L,T,M,S,S2,MARK,QA,OUT,T2]);
async function as(u,t,fn){
 await db.exec('SET ROLE authenticated');
 await db.query("SELECT set_config('test.uid',$1,false),set_config('test.tenant',$2,false)",[u,t]);
 try{return await fn();}finally{await db.exec('RESET ROLE');}
}
const teaching='We studied Newton second law including worked numeric examples and SI units. We observed experimental force, mass and acceleration relationships in a guided demonstration.';
const outcomes='Calculate forces and interpret experimental acceleration observations correctly.';
const expected='Provide calculations step by step and explain what happens to acceleration when mass is constant.';
const required='Provide two complete numerical force calculations, observations and a reasoned evidence discussion.';
let brief,first,second;
await as(L,T,async()=>{
 await db.query("INSERT INTO public.unipathway_assessment_briefs(tenant_id,module_id,lecturer_id,title,assessment_type,teaching_summary,learning_outcomes,student_expectations,required_evidence,due_at,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference) VALUES($1,$2,$3,'Forces and Motion Coursework','coursework',$4,$5,$6,$7,now()+interval '7 days',now()+interval '14 days',2,5,'APPROVED-POLICY-FIXTURE')",[T,MOD,L,teaching,outcomes,expected,required]);
 const a=await db.query("SELECT id FROM public.unipathway_assessment_briefs WHERE title='Forces and Motion Coursework'");
 assert.equal(a.rows.length,1);brief=a.rows[0].id;checks++;
 await db.query("INSERT INTO public.unipathway_assessment_criteria(tenant_id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order) VALUES ($1,$2,'LO1.P1','Calculate a numerical force using SI units','Present two accurate numerical calculations and justify methods','Award method credit where partial and full points where both are complete and correct',60,1),($1,$2,'LO2.P1','Explain the recorded measurements','Relate each recorded acceleration to applied force and constant mass','Award full points only with quantitative comparison and reasoned explanation',40,2)",[T,brief]);checks++;
 await denied(()=>db.query('SELECT public.publish_unipathway_assessment_brief($1)',[brief]),/authorised|permission/i);
});
await as(S,T,async()=>{
 assert.equal((await db.query('SELECT id FROM public.unipathway_assessment_briefs')).rows.length,0);checks++;
 await denied(()=>db.query("SELECT public.submit_unipathway_assessment($1,'This is not an authorised published assignment')",[brief]),/published|enrolment/i);
});
await as(M,T,async()=>{
 await db.query('SELECT public.publish_unipathway_assessment_brief($1)',[brief]);checks++;
 assert.equal((await db.query('SELECT id FROM public.unipathway_assessment_briefs WHERE status=$1',['published'])).rows.length,1);checks++;
});
await as(L,T,async()=>{
 await denied(()=>db.query('UPDATE public.unipathway_assessment_briefs SET penalty_points_per_resubmission=20 WHERE id=$1',[brief]),/policy|permission/i);
});
await as(OUT,T2,async()=>{
 assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_briefs')).rows.length,0);checks++;
 await denied(()=>db.query("SELECT public.submit_unipathway_assessment($1,'Detailed response from an ineligible user')",[brief]),/published|enrolment/i);
});
const original='I used F equals mass times acceleration. Five kilograms times two metres per second squared produces ten newtons. The observation table relates force to a fixed mass.';
await as(S,T,async()=>{
 const a=await db.query('SELECT public.submit_unipathway_assessment($1,$2) AS id',[brief,original]);
 first=a.rows[0].id;checks++;
 await denied(()=>db.query('SELECT public.submit_unipathway_assessment($1,$2)',[brief,original]),/Resubmission requires/i);
 assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_released_results')).rows.length,0);checks++;
});
await as(S2,T,async()=>{assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_attempts')).rows.length,0);checks++;});
await as(L,T,async()=>{
 await denied(()=>db.query('SELECT public.allocate_unipathway_independent_marker($1,$2,$3)',[first,MARK,QA]),/management/i);
 await denied(()=>db.query('SELECT public.record_unipathway_human_mark($1,$2,$3)',[first,'[]','Ineligible teaching lecturer marking']),/assigned/i);
});
await as(M,T,async()=>{
 await denied(()=>db.query('SELECT public.allocate_unipathway_independent_marker($1,$2,$3)',[first,L,QA]),/independent/i);
 await denied(()=>db.query('SELECT public.allocate_unipathway_independent_marker($1,$2,$3)',[first,MARK,MARK]),/independent/i);
 await db.query('SELECT public.allocate_unipathway_independent_marker($1,$2,$3)',[first,MARK,QA]);checks++;
});
await as(QA,T,async()=>{await denied(()=>db.query('SELECT public.release_unipathway_assessment_mark($1)',[first]),/approval|required/i);});
await as(MARK,T,async()=>{
 assert.equal((await db.query('SELECT id FROM public.unipathway_assessment_briefs WHERE id=$1',[brief])).rows.length,1);checks++;
 await db.query('SELECT public.request_unipathway_assessment_resubmission($1,$2)',[first,'Please add your quantitative observation table, fully label its units, then explain how constant mass changes acceleration at different applied forces.']);checks++;
});
await as(S,T,async()=>{
 const revised=original+' Observation table: 2 N force gives 1 m/s² at 2 kg, 4 N gives 2 m/s². Therefore acceleration doubles with doubled force.';
 second=(await db.query('SELECT public.submit_unipathway_assessment($1,$2) AS id',[brief,revised])).rows[0].id;checks++;
 await denied(()=>db.query('SELECT public.submit_unipathway_assessment($1,$2)',[brief,revised]),/Resubmission requires/i);
});
await as(M,T,async()=>{await db.query('SELECT public.allocate_unipathway_independent_marker($1,$2,$3)',[second,MARK,QA]);checks++;});
const scores=[
 {code:'LO1.P1',points:54,reason:'Both numerical calculations include correct SI units and an attributable method.',evidence:'ten newtons',missing:'An explicit uncertainty estimate could improve the presentation.'},
 {code:'LO2.P1',points:32,reason:'Quantitative observation comparisons demonstrate the correct proportional relationship.',evidence:'2 N force',missing:'A full table with confidence or accuracy notes would be beneficial.'}
];
await as(MARK,T,async()=>{
 await denied(()=>db.query('SELECT public.record_unipathway_human_mark($1,$2,$3)',[second,JSON.stringify(scores.slice(0,1)),'Human feedback provided but one rubric item omitted deliberately']),/Each published criterion/i);
 const a=await db.query('SELECT public.record_unipathway_human_mark($1,$2,$3) AS score',[second,JSON.stringify(scores),'Correct method with quantitative evidence; stronger discussion of measurement uncertainty would improve the response.']);
 assert.equal(Number(a.rows[0].score),81);checks++;
});
await as(S,T,async()=>{assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_human_marks')).rows.length,0);checks++;});
await as(QA,T,async()=>{
 await db.query('SELECT public.decide_unipathway_quality_mark($1,$2,$3)',[second,true,'Independently verified each criterion and confirmed both score and penalty comply with the rubric.']);checks++;
});
await as(S,T,async()=>{assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_released_results')).rows.length,0);checks++;});
await as(MARK,T,async()=>{await denied(()=>db.query('SELECT public.release_unipathway_assessment_mark($1)',[second]),/assigned IQA/i);});
await as(QA,T,async()=>{await db.query('SELECT public.release_unipathway_assessment_mark($1)',[second]);checks++;});
await as(S,T,async()=>{
 const a=await db.query('SELECT raw_score,penalty_points,final_score FROM public.unipathway_assessment_released_results');
 assert.equal(a.rows.length,1);assert.deepEqual([Number(a.rows[0].raw_score),Number(a.rows[0].penalty_points),Number(a.rows[0].final_score)],[86,5,81]);checks++;
});
await as(S2,T,async()=>{assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_released_results')).rows.length,0);checks++;});
await as(OUT,T2,async()=>{assert.equal((await db.query('SELECT * FROM public.unipathway_assessment_attempts')).rows.length,0);checks++;});
await db.close();
console.log('Independent assessor, IQA approval, two-tenant privacy and penalty RLS: '+checks+' checks passed.');
