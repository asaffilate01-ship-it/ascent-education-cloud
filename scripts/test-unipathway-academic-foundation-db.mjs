import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const TENANT_A='10000000-0000-0000-0000-000000000001';
const TENANT_B='10000000-0000-0000-0000-000000000002';
const ASSESSOR='20000000-0000-0000-0000-000000000001';
const IQA='20000000-0000-0000-0000-000000000002';
const OTHER='20000000-0000-0000-0000-000000000003';
const SUBMISSION='30000000-0000-0000-0000-000000000001';
let passed=0;
const sql=readFileSync('supabase/migrations/20260924070000_academic_ops_production.sql','utf8');
assert(!/\bCHECK\s*\([^;]{0,250}\(\s*SELECT\b/i.test(sql),'CHECK subqueries must be removed');
await db.exec([
 'CREATE ROLE anon; CREATE ROLE authenticated;',
 'CREATE TABLE public.submissions(id uuid PRIMARY KEY);',
 'CREATE TABLE public.modules(id uuid PRIMARY KEY);'
].join('\n'));
await db.query('INSERT INTO public.submissions(id) VALUES($1)',[SUBMISSION]);
await db.exec(sql);
const a=await db.query(
 "INSERT INTO public.assessment_reviews(tenant_id,submission_id,assessor_id,grade,feedback) VALUES($1,$2,$3,60,'Pilot review') RETURNING id",
 [TENANT_A,SUBMISSION,ASSESSOR]);
const assessmentId=a.rows[0].id;
passed++;
await assert.rejects(()=>db.query(
 "INSERT INTO public.iqa_reviews(tenant_id,assessment_review_id,iqa_id,decision) VALUES($1,$2,$3,'approved')",
 [TENANT_A,assessmentId,ASSESSOR]),/Independent IQA reviewer must differ/);
passed++;
await assert.rejects(()=>db.query(
 "INSERT INTO public.iqa_reviews(tenant_id,assessment_review_id,iqa_id,decision) VALUES($1,$2,$3,'approved')",
 [TENANT_B,assessmentId,IQA]),/assessment tenant/);
passed++;
const added=await db.query(
 "INSERT INTO public.iqa_reviews(tenant_id,assessment_review_id,iqa_id,decision) VALUES($1,$2,$3,'approved') RETURNING id",
 [TENANT_A,assessmentId,IQA]);
assert.equal(added.rows.length,1);passed++;
await assert.rejects(()=>db.query(
 'UPDATE public.assessment_reviews SET assessor_id=$1 WHERE id=$2',
 [IQA,assessmentId]),/violat.*independent IQA/);
passed++;
await assert.rejects(()=>db.query(
 'UPDATE public.iqa_reviews SET iqa_id=$1 WHERE id=$2',
 [ASSESSOR,added.rows[0].id]),/Independent IQA reviewer must differ/);
passed++;
const update=await db.query(
 'UPDATE public.assessment_reviews SET assessor_id=$1 WHERE id=$2 RETURNING assessor_id',
 [OTHER,assessmentId]);
assert.equal(update.rows[0].assessor_id,OTHER);passed++;
await db.close();
console.log('PASS: Supabase staging academic foundation compiles; '+passed+' independent marker/IQA tenant and update controls verified');
