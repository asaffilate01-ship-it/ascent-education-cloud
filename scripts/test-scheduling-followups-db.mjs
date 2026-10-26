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
await db.exec(`INSERT INTO modules VALUES('${id(20)}','${id(1)}','${id(10)}'),('${id(21)}','${id(1)}','${id(11)}'),('${id(22)}','${id(2)}','${id(15)}');INSERT INTO enrolments VALUES('${id(12)}','${id(20)}',true);`);
const original=readFileSync('supabase/migrations/20260317154315_94fbaf03-26d2-487b-809b-6a2c1e3208c3.sql','utf8');await db.exec(original.slice(0,original.indexOf('ALTER TABLE public.scheduled_lectures ENABLE')));
await db.exec(`ALTER TABLE scheduled_lectures ENABLE ROW LEVEL SECURITY;CREATE POLICY schedule_all ON scheduled_lectures TO authenticated USING(unipathway_acl.module_access(module_id,tenant_id)) WITH CHECK(unipathway_acl.module_access(module_id,tenant_id,true));GRANT SELECT,INSERT,UPDATE,DELETE ON scheduled_lectures TO authenticated;`);
await db.exec(readFileSync('supabase/migrations/20261026000118_schedule_and_staff_followup.sql','utf8'));
async function actor(n,sql,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE')}}
async function denied(fn){await assert.rejects(fn);checks++;}
const insert=(who,module=20,start='09:00',end='10:30',from='2026-10-01',until='2026-10-31',room='Room A',sem=1)=>actor(who,`INSERT INTO scheduled_lectures(module_id,lecturer_id,tenant_id,day_of_week,start_time,end_time,effective_from,effective_until,room,semester) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,$9) RETURNING id`,[id(module),id(who),id(who===15?2:1),start,end,from,until,room,sem]);
const first=(await insert(10)).rows[0].id;checks++;
await denied(()=>insert(10,20,'09:30','11:00'));await denied(()=>insert(10,20,'09:00','10:30','2026-10-01','2026-10-31','Other room',2));
await denied(()=>insert(11,21,'09:30','11:00','2026-10-01','2026-10-31',' room a '));
await insert(10,20,'10:30','12:00');checks++;
await insert(10,20,'09:00','10:30','2026-11-01','2026-11-30');checks++;
await insert(11,21,'09:00','10:30','2026-10-01','2026-10-31','Virtual');checks++;
await insert(15,22);checks++;
await actor(10,"update scheduled_lectures set cohort_reference='Year 10 A',change_reason='Assign student group' where id=$1",[first]);checks++;
await denied(()=>actor(11,"update scheduled_lectures set cohort_reference=' year 10 a ',change_reason='Assign student group' where module_id=$1",[id(21)]));
await denied(()=>actor(10,"update scheduled_lectures set is_active=false,change_reason='' where id=$1",[first]));
await actor(10,"update scheduled_lectures set is_active=false,change_reason='Teacher unavailable' where id=$1",[first]);checks++;
await insert(10);checks++;
await denied(()=>actor(10,'delete from scheduled_lectures where id=$1',[first]));
assert.equal((await actor(12,"select count(*)::int n from unipathway_schedule_changes where action='cancelled'")).rows[0].n,1);checks++;
assert.equal((await actor(15,'select count(*)::int n from unipathway_schedule_changes')).rows[0].n,1);checks++;
const task=(await actor(10,"INSERT INTO unipathway_staff_tasks(tenant_id,assigned_to,title,due_on) VALUES($1,$2,'Prepare next lesson','2026-10-27') RETURNING id",[id(1),id(11)])).rows[0].id;checks++;
for(const n of [10,11,13]){assert.equal((await actor(n,'select count(*)::int n from unipathway_staff_tasks')).rows[0].n,1);checks++;}
for(const n of [12,14,15,16]){assert.equal((await actor(n,'select count(*)::int n from unipathway_staff_tasks')).rows[0].n,0);checks++;}
await denied(()=>actor(10,"INSERT INTO unipathway_staff_tasks(tenant_id,assigned_to,title,due_on) VALUES($1,$2,'Foreign owner','2026-10-27')",[id(1),id(15)]));
await denied(()=>actor(12,"INSERT INTO unipathway_staff_tasks(tenant_id,assigned_to,title,due_on) VALUES($1,$2,'Student task','2026-10-27')",[id(1),id(10)]));
await denied(()=>actor(11,'update unipathway_staff_tasks set assigned_to=$1 where id=$2',[id(14),task]));
await denied(()=>actor(10,'update unipathway_staff_tasks set tenant_id=$1 where id=$2',[id(2),task]));
await denied(()=>actor(11,"update unipathway_staff_tasks set status='done' where id=$1",[task]));
await actor(11,"update unipathway_staff_tasks set status='done',outcome='Resources published' where id=$1 and version=1",[task]);checks++;
assert.equal((await actor(10,"update unipathway_staff_tasks set title='Stale overwrite' where id=$1 and version=1 returning id",[task])).rows.length,0);checks++;
assert.equal((await actor(10,'select count(*)::int n from unipathway_task_history')).rows[0].n,2);checks++;
assert.equal((await actor(14,'select count(*)::int n from unipathway_task_history')).rows[0].n,0);checks++;
await denied(()=>actor(10,'delete from unipathway_task_history'));
assert.equal((await actor(12,'select * from unipathway_task_assignees()')).rows.length,0);checks++;
assert.equal((await actor(10,'select * from unipathway_task_assignees()')).rows.length,4);checks++;
await db.exec(`UPDATE enrolments SET active=false`);assert.equal((await actor(12,'select count(*)::int n from unipathway_schedule_changes')).rows[0].n,0);checks++;
const generated=await actor(10,'select auto_schedule_module($1,$2,$3) result',[id(20),id(10),id(1)]);assert.ok(generated.rows[0].result.slots_assigned>0);checks++;
const repeated=await actor(10,'select auto_schedule_module($1,$2,$3) result',[id(20),id(10),id(1)]);assert.equal(repeated.rows[0].result.slots_assigned,0);checks++;
console.log(`Scheduling and follow-ups: ${checks} overlap, lifecycle, role, tenant, ownership and stale-write checks passed`);
}finally{await db.close();}
