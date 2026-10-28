import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;const id=n=>`93000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function as(n,sql){await db.exec(`SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id(n)}',false)`);try{return await db.query(sql);}finally{await db.exec('RESET ROLE');}}
async function denied(n,sql){await assert.rejects(as(n,sql));checks++;}
const propose=(request=30,title='Compare alternatives',body='Explain why your chosen approach fits the evidence.')=>`SELECT (public.propose_uni_centre_feedback('${id(request)}','${title}','${body}')).*`;
const review=(rev,action='approve',request=30)=>`SELECT (public.review_uni_centre_feedback('${id(request)}',${rev},'${action}','Internal review reference 2026')).*`;
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE DOMAIN public.app_role AS text;
CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE tenants(id uuid PRIMARY KEY);CREATE TABLE profiles(user_id uuid PRIMARY KEY,tenant_id uuid);CREATE TABLE user_roles(user_id uuid,role text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
CREATE FUNCTION has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
INSERT INTO tenants VALUES('${id(10)}'),('${id(20)}');
INSERT INTO auth.users SELECT ('93000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,7) n;
INSERT INTO profiles VALUES('${id(1)}','${id(10)}'),('${id(2)}','${id(10)}'),('${id(3)}','${id(20)}'),('${id(4)}','${id(10)}'),('${id(5)}','${id(10)}'),('${id(6)}','${id(20)}'),('${id(7)}','${id(10)}');
INSERT INTO user_roles VALUES('${id(1)}','assessor'),('${id(2)}','iqa_officer'),('${id(3)}','assessor'),('${id(4)}','student'),('${id(5)}','assessor'),('${id(6)}','iqa_officer'),('${id(7)}','centre_director');`);
await db.exec(readFileSync('supabase/migrations/20261028181047_centre_feedback_approval.sql','utf8'));
// A composite-returning volatile function is called once in FROM, never once per expanded column.
const proposal=sql=>sql.replace('SELECT (public.propose_uni_centre_feedback(', 'SELECT * FROM public.propose_uni_centre_feedback(').replace(')).*',')');
const decision=sql=>sql.replace('SELECT (public.review_uni_centre_feedback(', 'SELECT * FROM public.review_uni_centre_feedback(').replace(')).*',')');
assert.equal((await as(1,proposal(propose()))).rows[0].status,'proposed');checks++;
assert.equal((await as(1,proposal(propose()))).rows.length,1);assert.equal((await as(1,'SELECT * FROM uni_centre_feedback_events')).rows.length,1);checks++;
await denied(1,proposal(propose(30,'Changed title')));await denied(5,proposal(propose()));await denied(3,proposal(propose()));
for(const n of [2,4,7])await denied(n,proposal(propose(31)));
for(const n of [3,4,5,6,7]){assert.equal((await as(n,'SELECT * FROM uni_centre_feedback')).rows.length,0);assert.equal((await as(n,'SELECT * FROM uni_centre_feedback_events')).rows.length,0);checks++;}
assert.equal((await as(2,'SELECT * FROM uni_centre_feedback')).rows.length,1);checks++;
for(const n of [1,3,4,5,6,7])await denied(n,decision(review(1)));
await db.exec(`INSERT INTO user_roles VALUES('${id(1)}','iqa_officer')`);await denied(1,decision(review(1)));await db.exec(`DELETE FROM user_roles WHERE user_id='${id(1)}' AND role='iqa_officer'`);
await denied(2,decision(review(0)));await denied(2,`SELECT public.review_uni_centre_feedback('${id(30)}',1,'approve','short')`);
assert.equal((await as(2,decision(review(1)))).rows[0].revision,2);checks++;
assert.equal((await as(5,'SELECT * FROM uni_centre_feedback')).rows[0].status,'approved');assert.equal((await as(5,'SELECT * FROM uni_centre_feedback_events')).rows.length,2);checks++;
for(const n of [3,4,6,7]){assert.equal((await as(n,'SELECT * FROM uni_centre_feedback')).rows.length,0);checks++;}
await denied(2,decision(review(1,'withdraw')));await denied(2,decision(review(2,'approve')));
for(const sql of ["UPDATE uni_centre_feedback SET body='forged'","DELETE FROM uni_centre_feedback","UPDATE uni_centre_feedback_events SET reference='forged'","DELETE FROM uni_centre_feedback_events",`INSERT INTO uni_centre_feedback(id,tenant_id,proposed_by,title,body) VALUES('${id(40)}','${id(10)}','${id(1)}','Direct','Forbidden')`])await denied(1,sql);
// Audit failure rolls back approval and does not consume a state revision.
await as(1,proposal(propose(31)));
await db.exec(`CREATE FUNCTION fail_centre_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic audit failure';END$$;CREATE TRIGGER fail_audit BEFORE INSERT ON uni_centre_feedback_events FOR EACH ROW EXECUTE FUNCTION fail_centre_audit()`);
await denied(1,proposal(propose(32)));assert.equal((await as(1,`SELECT * FROM uni_centre_feedback WHERE id='${id(32)}'`)).rows.length,0);checks++;
await denied(2,decision(review(1,'approve',31)));assert.equal((await as(2,`SELECT revision FROM uni_centre_feedback WHERE id='${id(31)}'`)).rows[0].revision,1);checks++;
await db.exec('DROP TRIGGER fail_audit ON uni_centre_feedback_events;DROP FUNCTION fail_centre_audit()');
assert.equal((await as(2,decision(review(2,'withdraw')))).rows[0].status,'withdrawn');checks++;
assert.equal((await as(5,`SELECT * FROM uni_centre_feedback WHERE id='${id(30)}'`)).rows.length,0);assert.equal((await as(5,`SELECT * FROM uni_centre_feedback_events WHERE feedback_id='${id(30)}'`)).rows.length,0);checks++;
assert.equal((await as(1,`SELECT * FROM uni_centre_feedback_events WHERE feedback_id='${id(30)}'`)).rows.length,3);checks++;
await denied(2,decision(review(3)));await denied(2,decision(review(3,'withdraw')));
for(const table of ['uni_centre_feedback','uni_centre_feedback_events']){await db.exec('SET ROLE anon');await assert.rejects(db.query(`SELECT * FROM ${table}`));await db.exec('RESET ROLE');checks++;assert.equal((await db.query(`SELECT relrowsecurity FROM pg_class WHERE relname='${table}'`)).rows[0].relrowsecurity,true);checks++;}
for(const fn of ['propose_uni_centre_feedback(uuid,text,text)','review_uni_centre_feedback(uuid,integer,text,text)']){assert.equal((await db.query(`SELECT has_function_privilege('anon','public.${fn}','EXECUTE') AS allowed`)).rows[0].allowed,false);checks++;}
console.log(`${checks} centre feedback approval, tenant, idempotency and rollback checks passed`);
}finally{await db.close();}
