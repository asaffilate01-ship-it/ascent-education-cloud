import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();const id=n=>`94000000-0000-4000-8000-${String(n).padStart(12,'0')}`;let checks=0;
async function as(n,sql){await db.exec(`SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id(n)}',false)`);try{return await db.query(sql);}finally{await db.exec('RESET ROLE');}}
async function denied(n,sql){await assert.rejects(as(n,sql));checks++;}
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE DOMAIN app_role AS text;
CREATE TABLE tenants(id uuid PRIMARY KEY);CREATE TABLE profiles(user_id uuid PRIMARY KEY,tenant_id uuid);CREATE TABLE user_roles(user_id uuid,role text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND tenant_id=t)$$;
CREATE FUNCTION has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
for(const file of ['20261004150000_production_readiness_registry.sql','20261004172000_launch_readiness_catalog.sql','20261015134000_launch_gate_baseline.sql','20261015212552_readiness_evidence_reviews.sql','20261026232109_launch_registry_access_and_coverage.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
await db.exec(`INSERT INTO tenants VALUES('${id(10)}'),('${id(20)}');INSERT INTO profiles VALUES('${id(1)}','${id(10)}'),('${id(2)}','${id(10)}'),('${id(3)}','${id(20)}');INSERT INTO user_roles VALUES('${id(1)}','centre_director'),('${id(2)}','student'),('${id(3)}','superadmin');`);
const own=(await as(1,'SELECT * FROM production_readiness_checks')).rows;assert.equal(own.length,23);assert.ok(own.every(x=>x.tenant_id===id(10)));checks+=2;
assert.equal((await as(2,'SELECT * FROM production_readiness_checks')).rows.length,0);checks++;
assert.ok((await as(3,'SELECT * FROM production_readiness_checks')).rows.every(x=>x.tenant_id===id(20)));checks++;
const key=own[0].id;const review=(revision,status='pass',evidence="'acceptance/report'",notes='NULL',until="now()+interval '7 days'")=>`SELECT review_production_check('${key}',${revision},'${status}',${evidence},${notes},${until})`;
await denied(2,review(0));await denied(3,review(0));await denied(1,review(0,'pass','NULL'));await denied(1,review(0,'pass',"'report'",'NULL',"now()-interval '1 day'"));
assert.equal((await as(1,review(0))).rows[0].review_production_check,1);checks++;
await denied(1,review(0));await denied(1,"UPDATE production_readiness_checks SET status='pass'");await denied(1,"UPDATE production_integrations SET status='healthy'");await denied(1,'DELETE FROM production_readiness_reviews');
assert.equal((await as(1,'SELECT * FROM production_readiness_reviews')).rows.length,1);checks++;
assert.equal((await as(3,'SELECT * FROM production_readiness_reviews')).rows.length,0);checks++;
await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM production_readiness_checks'));await db.exec('RESET ROLE');checks++;
assert.equal((await db.query("SELECT has_function_privilege('anon','review_production_check(uuid,integer,text,text,text,timestamptz)','EXECUTE') AS allowed")).rows[0].allowed,false);checks++;
console.log(`${checks} launch readiness RLS, review concurrency and audit checks passed`);
}finally{await db.close();}
