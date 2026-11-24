// Isolated synthetic PostgreSQL rehearsal. Never connects to a hosted project.
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),foreign=id(2),lecturer=id(10),peer=id(11),director=id(12),otherDirector=id(13),finance=id(14),wrongRole=id(15),student=id(16);
const m=id(20),m2=id(21),fm=id(22),slot=id(30),second=id(31),otherSlot=id(32),foreignSlot=id(33),overlap=id(34),cancelled=id(35);
const day='2026-01-05',month='2026-01-01',version='2026-01-01T00:00:00Z',evidence='Teaching record 001';
let checks=0;
try{
 await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid,full_name text);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role text);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,lecturer_id uuid,title text);
 CREATE TABLE public.scheduled_lectures(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,lecturer_id uuid,day_of_week smallint,start_time time,end_time time,recurrence text,is_active boolean,effective_from date,effective_until date,updated_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 INSERT INTO public.tenants VALUES('${t}'),('${foreign}');
 `);
 for(const [u,centre,role,roleCentre] of [[lecturer,t,'lecturer',t],[peer,t,'lecturer',t],[director,t,'centre_director',t],[otherDirector,foreign,'centre_director',foreign],[finance,t,'finance_officer',t],[wrongRole,t,'centre_director',foreign],[student,t,'student',t]]){
  await db.query('INSERT INTO auth.users VALUES($1)',[u]);await db.query('INSERT INTO public.profiles VALUES($1,$2,$3)',[u,centre,role]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[u,roleCentre,role]);
 }
 await db.query("INSERT INTO public.modules VALUES($1,$2,$3,'Mathematics'),($4,$2,$5,'Physics'),($6,$7,$8,'Other centre')",[m,t,lecturer,m2,peer,fm,foreign,otherDirector]);
 for(const [s,c,mod,u,from,to,active] of [[slot,t,m,lecturer,'09:00','09:45',true],[second,t,m,lecturer,'10:00','11:30',true],[otherSlot,t,m2,peer,'09:00','10:30',true],[foreignSlot,foreign,fm,otherDirector,'09:00','09:45',true],[overlap,t,m,lecturer,'09:15','10:15',true],[cancelled,t,m,lecturer,'12:00','12:45',false]]){
  await db.query("INSERT INTO public.scheduled_lectures VALUES($1,$2,$3,$4,1,$5,$6,'weekly',$7,'2026-01-01',NULL,$8)",[s,c,mod,u,from,to,active,version]);
 }
 await db.exec(readFileSync('scripts/activation/unipathway-teaching-timesheets-forward.sql','utf8'));
 async function actor(u,sql,args=[],role='authenticated'){
  await db.query("SELECT set_config('test.uid',$1,false)",[u||'']);await db.exec('SET ROLE '+role);
  try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE');}
 }
 async function deny(fn){await assert.rejects(fn);checks++;}
 const val=async(u,sql,args=[],role='authenticated')=>(await actor(u,sql,args,role)).rows[0].value;
 const list=(u,role)=>val(u,'SELECT public.get_unipathway_teaching_timesheets($1,$2) value',[month,role]);
 const slots=(u,date=day)=>val(u,'SELECT public.get_unipathway_teaching_slots($1) value',[date]);
 const submit=(u,s=slot,date=day,minutes=40,note=evidence,rev=version)=>val(u,'SELECT public.submit_unipathway_teaching_timesheet($1,$2,$3,$4,$5) value',[s,date,minutes,note,rev]);
 const review=(u,claim,decision='approved',note='Evidence checked',rev=1)=>val(u,'SELECT public.review_unipathway_teaching_timesheet($1,$2,$3,$4) value',[claim,rev,decision,note]);
 await deny(()=>slots(lecturer));await deny(()=>submit(lecturer));await deny(()=>list(director,'centre_director'));
 await db.exec('UPDATE unipathway_teaching_ops.activation_gate SET reads_enabled=true');
 assert.equal((await slots(lecturer)).slots.length,3);checks++;
 await deny(()=>submit(lecturer));
 await deny(()=>slots(student));await deny(()=>list(wrongRole,'centre_director'));
 await deny(()=>val(null,'SELECT public.get_unipathway_teaching_slots($1) value',[day],'anon'));
 await deny(()=>actor(lecturer,'SELECT * FROM unipathway_teaching_ops.timesheets'));
 await deny(()=>actor(director,'UPDATE unipathway_teaching_ops.activation_gate SET writes_enabled=true'));
 await db.exec('UPDATE unipathway_teaching_ops.activation_gate SET writes_enabled=true');
 await deny(()=>submit(student));await deny(()=>submit(lecturer,otherSlot));await deny(()=>submit(lecturer,foreignSlot));await deny(()=>submit(lecturer,cancelled));await deny(()=>submit(lecturer,slot,'2026-01-06'));await deny(()=>submit(lecturer,slot,'2099-01-05'));await deny(()=>submit(lecturer,slot,day,46));await deny(()=>submit(lecturer,slot,day,0));await deny(()=>submit(lecturer,slot,day,40,'x'));await deny(()=>submit(lecturer,slot,day,40,evidence,'2026-01-02T00:00:00Z'));
 const receipt=await submit(lecturer);assert.equal(receipt.status,'submitted');checks++;
 assert.deepEqual(await submit(lecturer),receipt);checks++;
 await deny(()=>submit(lecturer,slot,day,41));await deny(()=>submit(lecturer,overlap,day,40));
 assert.equal((await list(peer,'lecturer')).rows.length,0);checks++;
 assert.equal((await list(otherDirector,'centre_director')).rows.length,0);checks++;
 assert.equal((await list(finance,'finance_officer')).rows.length,0);checks++;
 await deny(()=>review(otherDirector,receipt.id));await deny(()=>review(finance,receipt.id));await deny(()=>review(lecturer,receipt.id));
 await db.query("INSERT INTO public.user_roles VALUES($1,$2,'centre_director')",[lecturer,t]);await deny(()=>review(lecturer,receipt.id));
 const approved=await review(director,receipt.id);assert.equal(approved.status,'approved');assert.equal(approved.revision,2);checks++;
 assert.deepEqual(await review(director,receipt.id),approved);checks++;await deny(()=>review(director,receipt.id,'rejected'));
 const financeRows=(await list(finance,'finance_officer')).rows;assert.equal(financeRows.length,1);assert.equal(financeRows[0].actual_minutes,40);assert.equal(financeRows[0].evidence_reference,null);assert.equal(financeRows[0].review_note,null);checks++;
 const secondClaim=await submit(lecturer,second,day,90);await review(director,secondClaim.id,'rejected','Evidence incomplete');checks++;
 assert.equal((await list(finance,'finance_officer')).rows.length,1);checks++;
 assert.equal((await list(lecturer,'lecturer')).rows.length,2);checks++;
 await deny(()=>actor(lecturer,"UPDATE unipathway_teaching_ops.timesheets SET actual_minutes=45"));
 await db.query("DELETE FROM public.user_roles WHERE user_id=$1 AND role='lecturer'",[lecturer]);await deny(()=>slots(lecturer));await deny(()=>list(lecturer,'lecturer'));await deny(()=>submit(lecturer));
 console.log('Teaching timesheets: '+checks+' synthetic role, date, approval and isolation checks passed');
}finally{await db.close();}
