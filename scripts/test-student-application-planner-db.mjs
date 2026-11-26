// Isolated synthetic PostgreSQL rehearsal; no hosted database connection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(1),b=id(2),first=id(3),second=id(4),other=id(5),staff=id(6),plan=id(7);
const u=x=>"'"+x+"'::uuid";
const table='public.unipathway_student_application_plans';
const q=sql=>db.query(sql);
try{
 await db.exec(`
 CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE public.tenants(id uuid PRIMARY KEY,status text);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role text);
 INSERT INTO public.tenants VALUES('${a}','active'),('${b}','active');
 INSERT INTO public.profiles VALUES('${first}','${a}'),('${second}','${a}'),('${other}','${b}'),('${staff}','${a}');
 INSERT INTO public.user_roles VALUES('${first}','${a}','student'),('${second}','${a}','student'),('${other}','${b}','student'),('${staff}','${a}','centre_director');
 `);
 await db.exec(readFileSync('scripts/activation/unipathway-student-application-planner-forward.sql','utf8'));
 async function as(actor,sql,role='authenticated'){
  await db.exec('RESET ROLE'); await q("SELECT set_config('test.uid','"+(actor||'')+"',false)");
  await db.exec('SET ROLE '+role);
  try{return await q(sql);}finally{await db.exec('RESET ROLE');}
 }
 const insert=(tenant,title='University planning')=>`INSERT INTO ${table}(tenant_id,id,title,category,planning_date) VALUES(${u(tenant)},${u(plan)},'${title}','University application',DATE '2027-01-01') RETURNING owner_id`;
 const read=tenant=>`SELECT public.get_unipathway_student_application_plans(${u(tenant)}) AS items`;
 const rejects=(actor,sql,code='42501',role='authenticated')=>assert.rejects(()=>as(actor,sql,role),err=>err.code===code);
 const records=async(actor,tenant)=>(await as(actor,read(tenant))).rows[0].items;
 assert.equal((await q('SELECT enabled FROM unipathway_application_planning.activation')).rows[0].enabled,false);
 await rejects(first,read(a)); await rejects(first,insert(a)); await rejects(null,read(a),'42501','anon');
 await q('UPDATE unipathway_application_planning.activation SET enabled=true');
 assert.deepEqual(await records(first,a),[]);
 assert.equal((await as(first,insert(a))).rows[0].owner_id,first);
 assert.equal((await records(first,a)).length,1);
 assert.deepEqual(await records(second,a),[]);
 assert.deepEqual(await records(other,b),[]);
 await rejects(other,read(a));await rejects(first,insert(b));await rejects(staff,read(a));
 await rejects(first,`INSERT INTO ${table}(tenant_id,owner_id,title,category,planning_date) VALUES(${u(a)},${u(second)},'Spoof','Other',CURRENT_DATE)`);
 await rejects(first,`UPDATE ${table} SET owner_id=${u(second)}`);
 await rejects(first,`INSERT INTO ${table}(tenant_id,title,category,planning_date) VALUES(${u(a)},'university planning','University application',DATE '2027-01-01')`,'23505');
 await rejects(first,`INSERT INTO ${table}(tenant_id,title,category,planning_date) VALUES(${u(a)},'Bad category','invalid',CURRENT_DATE)`,'23514');
 assert.equal((await as(second,`UPDATE ${table} SET completed=true WHERE id=${u(plan)} RETURNING id`)).rows.length,0);
 assert.equal((await as(other,`DELETE FROM ${table} WHERE id=${u(plan)} RETURNING id`)).rows.length,0);
 assert.equal((await as(first,`UPDATE ${table} SET completed=true WHERE id=${u(plan)} RETURNING completed`)).rows[0].completed,true);
 assert.equal((await as(first,`DELETE FROM ${table} WHERE id=${u(plan)} RETURNING id`)).rows[0].id,plan);
 assert.deepEqual(await records(first,a),[]);
 await as(second,insert(a));
 await q(`DELETE FROM public.user_roles WHERE user_id=${u(second)}`);
 await rejects(second,read(a));
 await q(`UPDATE public.tenants SET status='suspended' WHERE id=${u(b)}`);
 await rejects(other,read(b));
 await q('UPDATE unipathway_application_planning.activation SET enabled=false');
 await rejects(first,read(a));
 console.log('Private student application planning: ownership, centre, activation, mutation and revocation checks passed.');
}finally{await db.close();}
