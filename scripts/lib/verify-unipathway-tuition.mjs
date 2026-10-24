import assert from 'node:assert/strict';
export async function verifyTuition(db){
 const id=n=>`82000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,student,peer,tutor,otherTutor,parent,programme,module,link]=Array.from({length:9},(_,i)=>id(i+1));let checks=0;
 const ok=(v,m)=>{assert.ok(v,m);checks++;};const rpc=async(q,args=[])=> (await db.query(q,args)).rows[0]?.value;
 const login=async u=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[u]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async f=>{await db.exec('SAVEPOINT denied');await assert.rejects(f);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 await db.exec('BEGIN');await db.query("insert into public.tenants(id,name,slug) values($1,'Tuition fixture','unipathway')",[tenant]);
 for(const [u,role] of [[student,'student'],[peer,'student'],[tutor,'lecturer'],[otherTutor,'lecturer'],[parent,'parent_guardian']]){await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[u,`${u}@example.invalid`]);await db.query('delete from public.user_roles where user_id=$1',[u]);await db.query('insert into public.user_roles(user_id,tenant_id,role) values($1,$2,$3)',[u,tenant,role]);}
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body) values($1,$2,'Tuition fixture programme','3','OTHM')",[programme,tenant]);
 await db.query("insert into public.modules(id,programme_id,tenant_id,title,lecturer_id) values($1,$2,$3,'Tuition mathematics',$4)",[module,programme,tenant,tutor]);
 await db.query('insert into public.student_enrolments(student_id,programme_id,tenant_id) values($1,$2,$3),($4,$2,$3)',[student,programme,tenant,peer]);
 await db.query('insert into public.parent_student_links(id,parent_id,student_id,tenant_id,verified) values($1,$2,$3,$4,true)',[link,parent,student,tenant]);
 const create=()=>rpc('select public.create_unipathway_learning_plan($1,$2,$3) value',[module,student,'Build confidence explaining equivalent fractions']);
 await login(student);await denied(create);ok((await rpc('select public.get_unipathway_tuition_roster() value')).length===0,'Students cannot enumerate tutor roster');
 await login(otherTutor);await denied(create);
 await login(tutor);ok((await rpc('select public.get_unipathway_tuition_roster() value')).length===2,'Assigned tutor sees enrolled learners');const plan=await create();ok(await create()===plan,'Plan creation retry is idempotent');
 const task=id(20),attempt=id(21),second=id(22);
 const add=(instruction='Explain why two quarters equal one half using your own example.')=>rpc('select public.add_unipathway_learning_task($1,$2,$3,$4,$5,$6) value',[plan,task,'Equivalent fractions','needs_support','Verbal baseline: learner could not explain equivalence.',instruction]);
 ok(await add()===task,'Tutor records diagnostic and activity');ok(await add()===task,'Activity retry does not duplicate');await denied(()=>add('Different instruction must not silently replace the diagnostic activity.'));
 await login(peer);ok((await db.query('select * from public.unipathway_learning_plans')).rows.length===0,'Peer cannot read another plan');await denied(()=>add());
 const submit=(request=attempt,response='Two quarters cover the same area as one half of my square.',help=false)=>rpc('select public.submit_unipathway_learning_attempt($1,$2,$3,$4) value',[task,request,response,help]);
 await denied(()=>submit());await login(student);ok((await db.query('select * from public.unipathway_learning_tasks')).rows.length===1,'Owner reads diagnostic and task');ok(await submit()===attempt,'Owner submits evidence');ok(await submit()===attempt,'Retry preserves single evidence attempt');await denied(()=>submit(id(23)));await denied(()=>submit(attempt,'Changed response',false));
 const review=(outcome='with_hints',feedback='With hints you explained the equal areas. Try another representation independently.')=>db.query('select public.review_unipathway_learning_attempt($1,$2,$3)',[attempt,outcome,feedback]);
 await denied(()=>review());await denied(()=>db.query("update public.unipathway_learning_attempts set outcome='independent' where id=$1",[attempt]));
 await login(parent);ok((await db.query('select * from public.unipathway_learning_attempts')).rows.length===0,'Verified parent cannot see private answers');ok((await rpc('select public.get_unipathway_guardian_learning() value')).length===0,'Parent has no implicit practice consent');await denied(()=>db.query('select public.set_unipathway_learning_share($1,$2,true)',[plan,link]));
 await login(otherTutor);await denied(()=>review());await login(tutor);await review();await review();await denied(()=>review('independent'));
 await login(student);ok(await submit(second,'',true)===second,'Help request may precede written response');await db.query('select public.set_unipathway_learning_share($1,$2,true)',[plan,link]);
 await login(parent);const summary=await rpc('select public.get_unipathway_guardian_learning() value');ok(summary.length===1&&summary[0].skills[0].outcome==='with_hints','Shared summary uses reviewed evidence while help is pending');ok(!JSON.stringify(summary).includes('Two quarters')&&!JSON.stringify(summary).includes('Verbal baseline'),'Summary excludes private answers and diagnostic notes');
 await login(tutor);await db.query('select public.review_unipathway_learning_attempt($1,$2,$3)',[second,'needs_support','We will work through another example together during your next lesson.']);
 await login(student);await db.query('select public.set_unipathway_learning_share($1,$2,false)',[plan,link]);await login(parent);ok((await rpc('select public.get_unipathway_guardian_learning() value')).length===0,'Revocation removes summary');
 await login(student);await db.query('select public.set_unipathway_learning_share($1,$2,true)',[plan,link]);await db.exec('RESET ROLE');await db.query('update public.parent_student_links set verified=false where id=$1',[link]);await db.query('update public.parent_student_links set verified=true where id=$1',[link]);await login(parent);ok((await rpc('select public.get_unipathway_guardian_learning() value')).length===0,'Reverification does not restore old consent');
 await db.exec('RESET ROLE');await db.query("update public.student_enrolments set status='withdrawn' where student_id=$1",[student]);await login(student);ok((await db.query('select * from public.unipathway_learning_plans')).rows.length===0,'Withdrawn learner loses plan access');await denied(()=>submit(id(24)));await denied(()=>db.query('select public.set_unipathway_learning_share($1,$2,true)',[plan,link]));
 await db.exec('RESET ROLE');await db.query('update public.modules set lecturer_id=$1 where id=$2',[otherTutor,module]);await login(tutor);ok((await db.query('select * from public.unipathway_learning_plans')).rows.length===0,'Reassigned tutor loses evidence access');await denied(()=>add());
 await db.exec('RESET ROLE; SET LOCAL ROLE anon');await denied(()=>db.query('select * from public.unipathway_learning_plans'));await denied(()=>create());
 await db.exec('ROLLBACK');console.log(JSON.stringify({tuitionLearningChecks:checks,status:'passed'}));
}
