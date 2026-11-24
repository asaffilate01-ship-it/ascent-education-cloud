// Isolated PGlite test: exact timesheet and remuneration forward SQL; no hosted access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),b=id(2),lecturer=id(10),peer=id(11),director=id(12),finance=id(13),foreign=id(14),student=id(15),wrongRole=id(16);
const m=id(20),slot=id(21),peerSlot=id(22),start='2026-01-01',end='2026-01-31',month='2026-01-01',ref='Signed rate evidence';
let checks=0;
try{
 await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid,full_name text);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role text);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,lecturer_id uuid,title text);
 CREATE TABLE public.scheduled_lectures(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,lecturer_id uuid,day_of_week smallint,start_time time,end_time time,recurrence text,is_active boolean,effective_from date,effective_until date,updated_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 INSERT INTO public.tenants VALUES('${t}'),('${b}');
 `);
 for(const [u,c,r,rc] of [[lecturer,t,'lecturer',t],[peer,t,'lecturer',t],[director,t,'centre_director',t],[finance,t,'finance_officer',t],[foreign,b,'finance_officer',b],[student,t,'student',t],[wrongRole,t,'finance_officer',b]]){
  await db.query('INSERT INTO auth.users VALUES($1)',[u]);await db.query('INSERT INTO public.profiles VALUES($1,$2,$3)',[u,c,r]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[u,rc,r]);
 }
 await db.query("INSERT INTO public.modules VALUES($1,$2,$3,'Maths')",[m,t,lecturer]);
 await db.query("INSERT INTO public.scheduled_lectures VALUES($1,$2,$3,$4,1,'09:00','09:45','weekly',true,'2026-01-01',NULL,'2026-01-01T00:00:00Z'),($5,$2,$3,$6,1,'10:00','10:45','weekly',true,'2026-01-01',NULL,'2026-01-01T00:00:00Z')",[slot,t,m,lecturer,peerSlot,peer]);
 for(const f of ['unipathway-teaching-timesheets-forward.sql','unipathway-teaching-rates-forward.sql'])await db.exec(readFileSync('scripts/activation/'+f,'utf8'));
 async function actor(u,sql,args=[],role='authenticated'){await db.query("SELECT set_config('test.uid',$1,false)",[u||'']);await db.exec('SET ROLE '+role);try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}}
 async function denied(fn){await assert.rejects(fn);checks++;}
 const val=async(u,sql,args=[],role='authenticated')=>(await actor(u,sql,args,role)).rows[0].value;
 const get=(u,role)=>val(u,'SELECT public.get_unipathway_teaching_rates($1,$2) value',[month,role]);
 const proposal=(u,req=id(40),target=lecturer,from=start,until=end,basis='hourly',rate=100000,reference=ref)=>val(u,'SELECT public.propose_unipathway_teaching_rate($1,$2,$3,$4,$5,$6,$7) value',[req,target,from,until,basis,rate,reference]);
 const review=(u,req=id(40),decision='approved',note='Agreement checked')=>val(u,'SELECT public.review_unipathway_teaching_rate($1,$2,$3) value',[req,decision,note]);
 const preview=(u)=>val(u,'SELECT public.preview_unipathway_teaching_remuneration($1) value',[month]);
 await denied(()=>get(director,'centre_director'));await db.exec('UPDATE unipathway_teaching_ops.activation_gate SET reads_enabled=true,writes_enabled=true');
 await denied(()=>get(director,'centre_director'));await db.exec('UPDATE unipathway_teaching_rates.activation_gate SET reads_enabled=true');
 assert.equal((await get(director,'centre_director')).roster.length,2);checks++;
 await denied(()=>proposal(director));await denied(()=>get(student,'centre_director'));await denied(()=>get(wrongRole,'finance_officer'));await denied(()=>actor(finance,'SELECT * FROM unipathway_teaching_rates.agreements'));
 await db.exec('UPDATE unipathway_teaching_rates.activation_gate SET writes_enabled=true');
 await denied(()=>proposal(finance));await denied(()=>proposal(director,id(41),student));await denied(()=>proposal(director,id(41),lecturer,start,end,'hourly',0));
 await denied(()=>proposal(director,id(41),lecturer,end,start));
 const first=await proposal(director);assert.equal(first.status,'pending');checks++;
 assert.deepEqual(await proposal(director),first);checks++;await denied(()=>proposal(director,id(40),lecturer,start,end,'hourly',200000));
 await denied(()=>proposal(director,id(41),lecturer,'2026-01-31','2026-02-28'));await denied(()=>review(foreign));await denied(()=>review(director));
 await db.query("INSERT INTO public.user_roles VALUES($1,$2,'finance_officer')",[director,t]);await denied(()=>review(director));
 const approved=await review(finance);assert.equal(approved.status,'approved');checks++;assert.deepEqual(await review(finance),approved);checks++;await denied(()=>review(finance,id(40),'rejected'));
 await proposal(director,id(41),peer,start,end,'session',200000);await review(finance,id(41));
 await proposal(director,id(42),lecturer,'2026-02-01','2026-02-28');await review(finance,id(42));
 await denied(()=>actor(student,'INSERT INTO unipathway_teaching_rates.agreements(id) VALUES($1)',[id(80)]));
 assert.equal((await get(foreign,'finance_officer')).rates.length,0);checks++;
 assert.equal((await get(finance,'finance_officer')).roster.length,0);checks++;
 // Fixtures are explicitly synthetic approved or pending timesheets, not real payroll.
 for(const [i,u,day,planned,actual,status] of [[50,lecturer,'2026-01-05',45,40,'approved'],[51,lecturer,'2026-01-12',45,20,'approved'],[52,peer,'2026-01-05',45,45,'approved'],[53,peer,'2026-01-12',45,30,'approved'],[54,peer,'2026-01-19',45,40,'submitted']]){
  const done=status==='approved';
  await db.query("INSERT INTO unipathway_teaching_ops.timesheets(id,tenant_id,lecturer_id,schedule_id,module_id,module_title,teaching_date,scheduled_start,scheduled_end,scheduled_revision,planned_minutes,actual_minutes,evidence_reference,status,revision,reviewed_by,reviewed_at,review_note) VALUES($1,$2,$3,$4,$5,'Maths',$6,'09:00','09:45',now(),$7,$8,'Synthetic evidence',$9,$10,$11,$12,$13)",[id(i),t,u,u===peer?peerSlot:slot,m,day,planned,actual,status,done?2:1,done?director:null,done?'2026-02-01T00:00:00Z':null,done?'Reviewed evidence':null]);
 }
 // A different historical lecturer has no approved rate.
 await db.query("INSERT INTO unipathway_teaching_ops.timesheets(tenant_id,lecturer_id,schedule_id,module_id,module_title,teaching_date,scheduled_start,scheduled_end,scheduled_revision,planned_minutes,actual_minutes,evidence_reference,status,revision,reviewed_by,reviewed_at,review_note) VALUES($1,$2,$3,$4,'Maths','2026-01-26','09:00','09:45',now(),45,45,'Synthetic evidence','approved',2,$5,now(),'Reviewed evidence')",[t,student,slot,m,director]);
 const v=await preview(finance);assert.equal(v.approved_claims,5);assert.equal(v.pending_claims,1);assert.equal(v.rows.find(r=>r.lecturer_id===lecturer).gross_paisa,100000);assert.equal(v.rows.find(r=>r.lecturer_id===peer&&r.resolution==='calculated').gross_paisa,200000);assert.equal(v.rows.find(r=>r.resolution==='partial_session').gross_paisa,null);assert.equal(v.rows.find(r=>r.resolution==='missing_rate').gross_paisa,null);checks+=6;
 assert.equal((await preview(foreign)).rows.length,0);checks++;await denied(()=>preview(student));await denied(()=>val(null,'SELECT public.preview_unipathway_teaching_remuneration($1) value',[month],'anon'));
 console.log('Teaching rate agreements: '+checks+' isolated security, approval and exact remuneration checks passed');
}finally{await db.close();}
