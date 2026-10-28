import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;const id=n=>`92000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function as(n,sql){await db.exec(`SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id(n)}',false)`);try{return await db.query(sql);}finally{await db.exec('RESET ROLE');}}
async function denied(n,sql){await assert.rejects(as(n,sql));checks++;}
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE DOMAIN app_role AS text;
CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE tenants(id uuid PRIMARY KEY);CREATE TABLE profiles(user_id uuid PRIMARY KEY,tenant_id uuid);CREATE TABLE user_roles(user_id uuid,role text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
CREATE FUNCTION has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
CREATE TABLE unipathway_assessment_attempts(id uuid PRIMARY KEY,tenant_id uuid,brief_id uuid,status text);
CREATE TABLE unipathway_assessment_allocations(attempt_id uuid,tenant_id uuid,marker_id uuid);
CREATE TABLE unipathway_assessment_criteria(brief_id uuid,criterion_code text);
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`);
const activation=readFileSync('supabase/migrations/20261026080443_assessment_live_activation.sql','utf8');await db.exec(activation.match(/CREATE OR REPLACE FUNCTION public.can_mark_uni_attempt[\s\S]*?\$assess_marker\$;/)[0]);
await db.exec(readFileSync('supabase/migrations/20261026173755_assessor_saved_drafts.sql','utf8'));
await db.exec(`INSERT INTO tenants VALUES('${id(10)}'),('${id(20)}');INSERT INTO auth.users VALUES('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}');
INSERT INTO profiles VALUES('${id(1)}','${id(10)}'),('${id(2)}','${id(10)}'),('${id(3)}','${id(20)}'),('${id(4)}','${id(10)}');INSERT INTO user_roles VALUES('${id(1)}','assessor'),('${id(2)}','assessor'),('${id(3)}','assessor'),('${id(4)}','student');
INSERT INTO unipathway_assessment_attempts VALUES('${id(30)}','${id(10)}','${id(40)}','submitted');INSERT INTO unipathway_assessment_allocations VALUES('${id(30)}','${id(10)}','${id(1)}');INSERT INTO unipathway_assessment_criteria VALUES('${id(40)}','A');`);
const save=(rev,criteria='{}')=>`SELECT (public.save_uni_marking_draft('${id(30)}',${rev},'${criteria}'::jsonb,'Private feedback','')).revision`;
assert.equal((await as(1,save(0))).rows[0].revision,1);checks++;
for(const n of [2,3,4]){await denied(n,save(1));assert.equal((await as(n,'SELECT * FROM uni_marking_drafts')).rows.length,0);checks++;}
await denied(1,save(0));
await denied(1,save(1,'{"X":{"code":"X","points":1,"reason":"","evidence":"","missing":""}}'));
await denied(1,save(1,'{"A":{"code":"A","points":null,"reason":"","evidence":"","missing":""}}'));
await denied(1,save(1,'{"A":{"code":"A","points":0}}'));
assert.equal((await as(1,save(1,'{"A":{"code":"A","points":0,"reason":"","evidence":"","missing":""}}'))).rows[0].revision,2);checks++;
assert.equal((await as(1,'SELECT * FROM uni_marking_draft_events')).rows.length,2);checks++;
// Rehearse upgrade from metadata-only receipts; only the surviving current revision is recoverable.
await db.exec(readFileSync('supabase/migrations/20261028164935_private_marking_draft_snapshots.sql','utf8'));
const history=(await as(1,'SELECT * FROM uni_marking_draft_events ORDER BY revision')).rows;
assert.equal(history[0].criteria,null);assert.equal(history[0].feedback,null);checks++;
assert.equal(history[1].criteria.A.code,'A');assert.equal(history[1].feedback,'Private feedback');checks++;
for(const n of [2,3,4]){assert.equal((await as(n,'SELECT * FROM uni_marking_draft_events')).rows.length,0);checks++;}
await denied(1,"UPDATE uni_marking_draft_events SET feedback='forged'");
await denied(1,`INSERT INTO uni_marking_draft_events(attempt_id,marker_id,tenant_id,revision) VALUES('${id(30)}','${id(1)}','${id(10)}',99)`);
// A failed snapshot insert must roll back the draft update and consume no revision.
await db.exec(`CREATE FUNCTION fail_draft_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic snapshot failure';END$$;
CREATE TRIGGER fail_snapshot BEFORE INSERT ON uni_marking_draft_events FOR EACH ROW EXECUTE FUNCTION fail_draft_snapshot()`);
await denied(1,save(2));assert.equal((await as(1,'SELECT revision FROM uni_marking_drafts')).rows[0].revision,2);checks++;
assert.equal((await as(1,'SELECT * FROM uni_marking_draft_events')).rows.length,2);checks++;
await db.exec('DROP TRIGGER fail_snapshot ON uni_marking_draft_events;DROP FUNCTION fail_draft_snapshot()');
assert.equal((await as(1,save(2))).rows[0].revision,3);checks++;
const latest=(await as(1,'SELECT * FROM uni_marking_draft_events WHERE revision=3')).rows[0];
assert.deepEqual(latest.criteria,{});assert.equal(latest.feedback,'Private feedback');assert.equal(latest.guidance,'');checks++;
await denied(1,save(2));assert.equal((await as(1,'SELECT * FROM uni_marking_draft_events')).rows.length,3);checks++;
await assert.rejects(db.exec("UPDATE uni_marking_draft_events SET feedback=NULL WHERE revision=3"));checks++;
await assert.rejects(db.exec("UPDATE uni_marking_draft_events SET criteria='[]' WHERE revision=3"));checks++;
assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='uni_marking_draft_events'")).rows[0].relrowsecurity,true);checks++;

await denied(1,"UPDATE uni_marking_drafts SET feedback='forged'");await denied(1,'DELETE FROM uni_marking_draft_events');
await db.exec(`UPDATE unipathway_assessment_attempts SET status='human_marked'`);await denied(1,save(3));
await db.exec(`UPDATE unipathway_assessment_allocations SET marker_id='${id(2)}'`);assert.equal((await as(1,'SELECT * FROM uni_marking_drafts')).rows.length,0);checks++;assert.equal((await as(1,'SELECT * FROM uni_marking_draft_events')).rows.length,0);checks++;
await db.exec(`UPDATE unipathway_assessment_attempts SET status='qa_rejected'`);assert.equal((await as(2,save(0))).rows[0].revision,1);assert.equal((await as(2,'SELECT * FROM uni_marking_drafts')).rows.length,1);checks+=2;assert.equal((await as(2,'SELECT * FROM uni_marking_draft_events')).rows.length,1);checks++;
await as(1,"INSERT INTO uni_feedback_snippets(title,body) VALUES('Reasoning','Explain the reasoning behind your approach.')");checks++;
for(const n of [2,3,4]){assert.equal((await as(n,'SELECT * FROM uni_feedback_snippets')).rows.length,0);checks++;}
await denied(4,"INSERT INTO uni_feedback_snippets(title,body) VALUES('Bad','Forbidden')");
await denied(1,`INSERT INTO uni_feedback_snippets(owner_id,title,body) VALUES('${id(2)}','Bad','Forbidden')`);
await denied(1,`INSERT INTO uni_feedback_snippets(tenant_id,title,body) VALUES('${id(20)}','Bad','Forbidden')`);
await denied(1,"UPDATE uni_feedback_snippets SET title='overwrite'");
assert.equal((await as(2,'DELETE FROM uni_feedback_snippets RETURNING id')).rows.length,0);checks++;
assert.equal((await as(1,'DELETE FROM uni_feedback_snippets RETURNING id')).rows.length,1);checks++;
assert.equal((await db.query("SELECT has_function_privilege('anon','public.save_uni_marking_draft(uuid,integer,jsonb,text,text)','EXECUTE') AS allowed")).rows[0].allowed,false);checks++;
await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM uni_marking_drafts'));await db.exec('RESET ROLE');checks++;
console.log(`${checks} marking draft and personal feedback permissions/concurrency checks passed`);
}finally{await db.close();}
