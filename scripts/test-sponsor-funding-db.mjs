import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite({extensions:{btree_gist}});let checks=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA extensions;CREATE SCHEMA unipathway_acl;
CREATE TABLE tenants(id uuid primary key);CREATE TABLE profiles(user_id uuid primary key,tenant_id uuid,full_name text);CREATE TABLE user_roles(user_id uuid,tenant_id uuid,role text);
CREATE TABLE modules(id uuid primary key,tenant_id uuid,lecturer_id uuid);CREATE TABLE enrolments(student uuid,module uuid,active boolean DEFAULT true);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
CREATE FUNCTION unipathway_acl.module_access(m uuid,t uuid,w boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.modules x WHERE x.id=m AND x.tenant_id=t AND (x.lecturer_id=auth.uid() OR (NOT w AND EXISTS(SELECT 1 FROM public.enrolments e WHERE e.student=auth.uid() AND e.module=m AND e.active))))$$;
GRANT USAGE ON SCHEMA public,auth,unipathway_acl TO authenticated;
INSERT INTO tenants VALUES('${id(1)}'),('${id(2)}');`);
for(const [u,t,r] of [[10,1,'lecturer'],[11,1,'lecturer'],[12,1,'student'],[13,1,'centre_director'],[14,1,'finance_officer'],[15,2,'lecturer'],[16,1,'agent']]){
 await db.query('insert into profiles values($1,$2,$3)',[id(u),id(t),r]);await db.query('insert into user_roles values($1,$2,$3)',[id(u),id(t),r]);
}
await db.exec(`CREATE TABLE invoices(id uuid primary key,tenant_id uuid,student_id uuid,type text DEFAULT 'tuition',amount numeric,paid numeric DEFAULT 0,status text DEFAULT 'pending',due_date date,created_at timestamptz DEFAULT now());
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_manage ON invoices TO authenticated USING(tenant_id=get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'centre_director')));
CREATE POLICY student_read ON invoices FOR SELECT TO authenticated USING(student_id=auth.uid());
GRANT SELECT,INSERT,UPDATE ON invoices TO authenticated;
INSERT INTO invoices(id,tenant_id,student_id,amount) VALUES('${id(30)}','${id(1)}','${id(12)}',1000),('${id(31)}','${id(2)}','${id(15)}',9999);`);
await db.exec(readFileSync('supabase/migrations/20261026064754_sponsor_fee_allocations.sql','utf8'));
async function actor(n,sql,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE')}}
async function denied(fn){await assert.rejects(fn);checks++;}
await actor(14,"update invoices set sponsor_amount=800,sponsor_name='Employer',sponsor_reference='AG-1',funding_note='Approved agreement AG-1' where id=$1",[id(30)]);checks++;
assert.equal((await actor(12,'select * from invoices')).rows.length,0);checks++;
const mine=(await actor(12,'select * from get_unipathway_my_fee_invoices()')).rows;assert.equal(mine.length,1);assert.equal(Number(mine[0].sponsor_amount),800);assert.equal(mine[0].sponsor_reference,undefined);checks+=3;
for(const who of [10,16,15]){assert.equal((await actor(who,'select * from get_unipathway_my_fee_invoices()')).rows.length,0);checks++;}
await actor(14,"update invoices set sponsor_paid=300,funding_note='Receipt verified bank 123' where id=$1",[id(30)]);checks++;
assert.equal(Number((await actor(14,'select paid from invoices where id=$1',[id(30)])).rows[0].paid),0);checks++;
for(const clause of ["sponsor_amount=700","sponsor_paid=200","amount=1100","paid=201","student_id='"+id(11)+"'","tenant_id='"+id(2)+"'"]){await denied(()=>actor(14,`update invoices set ${clause} where id=$1`,[id(30)]));}
assert.equal((await actor(12,'select * from unipathway_funding_events')).rows.length,0);checks++;
assert.equal((await actor(14,'select * from unipathway_funding_events')).rows.length,2);checks++;
await denied(()=>actor(14,"update unipathway_funding_events set note='tampered'"));
await actor(14,'update invoices set paid=200 where id=$1',[id(30)]);checks++;
assert.equal(Number((await actor(12,'select * from get_unipathway_my_fee_invoices()')).rows[0].paid),200);checks++;
await db.exec('SET ROLE anon');await denied(()=>db.query('select * from get_unipathway_my_fee_invoices()'));await db.exec('RESET ROLE');
console.log(`Funding: ${checks} permission, liability and immutable evidence checks passed`);
}finally{await db.close();}
