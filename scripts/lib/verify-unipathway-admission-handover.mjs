import assert from 'node:assert/strict';
export async function verifyAdmissionHandover(db){
 const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,other,staff,student,outsider,programme,module,application,session]=Array.from({length:9},(_,i)=>id(i+1));
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const complete=(stage='unconditional_offer',target=programme)=>db.query('select public.complete_unipathway_admission($1,$2,$3,$4,$5) id',[application,student,target,stage,'Approved unconditional offer and confirmed identity reviewed']);
 await db.exec('BEGIN');
 await db.query("insert into public.tenants(id,name,slug) values($1,'Admission QA','unipathway')",[tenant]);
 for(const [user,role,email] of [[staff,'admissions_admin','staff@example.invalid'],[student,'student','learner@example.invalid']]){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[user,email]);
  await db.query('delete from public.user_roles where user_id=$1',[user]);
  await db.query('insert into public.user_roles(user_id,role,tenant_id) values($1,$2,$3)',[user,role,tenant]);
 }
 await db.query("update public.tenants set slug='admission-qa' where id=$1",[tenant]);
 await db.query("insert into public.tenants(id,name,slug) values($1,'Other centre','unipathway')",[other]);
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'outside@example.invalid',now())",[outsider]);
 await db.query("insert into public.user_roles(user_id,role,tenant_id) values($1,'admissions_admin',$2)",[outsider,other]);
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body,status) values($1,$2,'QA programme','3','OTHM','active')",[programme,tenant]);
 await db.query("insert into public.modules(id,programme_id,tenant_id,title) values($1,$2,$3,'QA module')",[module,programme,tenant]);
 await db.query("insert into public.applications(id,tenant_id,student_name,email,stage) values($1,$2,'QA Learner','learner@example.invalid','unconditional_offer')",[application,tenant]);
 await db.query("insert into public.live_class_sessions(id,tenant_id,module_id,title,organiser_user_id,starts_at,ends_at) values($1,$2,$3,'Private class',$4,now(),now()+interval '1 hour')",[session,tenant,module,staff]);
 await login(student);
 ok(!(await db.query('select public.can_view_unipathway_module($1) allowed',[module])).rows[0].allowed,'No materials before enrolment');
 await denied(()=>complete());
 await login(outsider);await denied(()=>complete());
 await login(staff);
 const opts=(await db.query('select public.get_unipathway_admission_options($1) options',[application])).rows[0].options;
 ok(opts.candidates.length===1&&opts.programmes.length===1,'Only eligible confirmed matching accounts and programmes');
 await denied(()=>complete('lead'));await denied(()=>complete('unconditional_offer',id(99)));
 await db.exec('RESET ROLE');
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[student]);
 await login(staff);await denied(()=>complete());
 await db.exec('RESET ROLE');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[student]);
 // Owner-level check demonstrates trigger protection independently of RLS privileges.
 await denied(()=>db.query("update public.applications set stage='enrolled' where id=$1",[application]));
 await login(staff);const first=(await complete()).rows[0].id;
 ok(!!first,'Approved handover creates an enrolment');
 ok((await complete()).rows[0].id===first,'Retry returns the same enrolment');
 await db.exec('RESET ROLE');
 ok((await db.query('select count(*)::int n from public.student_enrolments where application_id=$1',[application])).rows[0].n===1,'No duplicate enrolment');
 ok((await db.query('select count(*)::int n from public.invoices where student_id=$1',[student])).rows[0].n===0,'No invented tuition invoice');
 await denied(()=>db.query("update public.applications set stage='lead' where id=$1",[application]));
 await denied(()=>db.query('update public.applications set user_id=$1 where id=$2',[outsider,application]));
 await login(student);
 ok((await db.query('select public.can_view_unipathway_module($1) allowed',[module])).rows[0].allowed,'Enrolment unlocks own module access');
 ok(!(await db.query('select public.can_join_unipathway_class($1) allowed',[session])).rows[0].allowed,'Enrolment does not bypass class invitation');
 await denied(()=>db.query("insert into public.student_enrolments(student_id,programme_id,tenant_id) values($1,$2,$3)",[student,programme,tenant]));
 await db.exec('ROLLBACK');console.log(JSON.stringify({admissionFullSchemaChecks:checks,status:'passed'}));
}
