import assert from 'node:assert/strict';
export async function verifyTeamsTeaching(db){
 const id=n=>`61000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,tutor,student,peer,programme,module,session,other,outsider]=Array.from({length:9},(_,i)=>id(i+1));
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 await db.exec('BEGIN');
 await db.query("insert into public.tenants(id,name,slug) values($1,'Audio centre','unipathway')",[tenant]);
 for(const [user,role] of [[tutor,'lecturer'],[student,'student'],[peer,'student']]){
  await db.query('insert into auth.users(id,email) values($1,$2)',[user,`${user}@example.invalid`]);
  await db.query('delete from public.user_roles where user_id=$1',[user]);
  await db.query('insert into public.user_roles(user_id,tenant_id,role) values($1,$2,$3)',[user,tenant,role]);
 }
 await db.query("update public.tenants set slug='audio-a' where id=$1",[tenant]);
 await db.query("insert into public.tenants(id,name,slug) values($1,'Other audio centre','unipathway')",[other]);
 await db.query('insert into auth.users(id,email) values($1,$2)',[outsider,'other-audio@example.invalid']);
 await db.query("insert into public.user_roles(user_id,tenant_id,role) values($1,$2,'lecturer')",[outsider,other]);
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body) values($1,$2,'Language','3','OTHM')",[programme,tenant]);
 await db.query("insert into public.modules(id,programme_id,tenant_id,title,lecturer_id) values($1,$2,$3,'Listening',$4)",[module,programme,tenant,tutor]);
 await db.query('insert into public.student_enrolments(student_id,programme_id,tenant_id) values($1,$2,$3)',[student,programme,tenant]);
 await db.query("insert into public.live_class_sessions(id,tenant_id,module_id,title,organiser_user_id,starts_at,ends_at) values($1,$2,$3,'Audio class',$4,now(),now()+interval '1 hour')",[session,tenant,module,tutor]);
 await db.query('insert into public.live_class_invitations(tenant_id,session_id,user_id,invited_by) values($1,$2,$3,$4)',[tenant,session,student,tutor]);

 const read=async()=> (await db.query('select public.get_unipathway_teams_plan($1) value',[session])).rows[0].value;
 const group=[{name:'Pair 1',task:'Discuss the assignment',members:[student]}];
 const write=(revision,groups=group,duration=15)=>db.query('select public.save_unipathway_teams_plan($1,$2,$3::jsonb,$4,$5) value',[session,revision,JSON.stringify(groups),'Practice',duration]);
 await login(tutor);ok((await read()).revision===0,'Empty plan');
 ok((await read()).roster.length===1,'Only active invited students in roster');
 ok((await write(0)).rows[0].value===1,'Tutor saves first revision');
 await denied(()=>write(0));
 await denied(()=>write(1,[...group,...group]));
 await denied(()=>write(1,[{...group[0],members:[peer]}]));
 await denied(()=>write(1,group,0));
 await denied(()=>write(1,[{...group[0],members:[]}]));
 await denied(()=>db.query("update public.unipathway_teams_teaching_plans set revision=999 where session_id=$1",[session]));
 await login(student);const own=await read();
 ok(own.groups.length===1&&own.groups[0].name==='Pair 1','Learner receives own group');
 ok(!own.groups[0].members&&own.roster.length===0&&!own.can_manage,'Learner never receives member IDs or full roster');
 ok((await db.query('select * from public.unipathway_teams_teaching_plans')).rows.length===0,'RLS hides full plan');
 await denied(()=>write(1));
 await login(peer);await denied(read);await denied(()=>write(1));
 await db.exec('RESET ROLE');
 await db.query('insert into public.student_enrolments(student_id,programme_id,tenant_id) values($1,$2,$3)',[peer,programme,tenant]);
 await db.query('insert into public.live_class_invitations(tenant_id,session_id,user_id,invited_by) values($1,$2,$3,$4)',[tenant,session,peer,tutor]);
 await login(tutor);await write(1,[...group,{name:'Other group',task:'Private task',members:[peer]}]);
 await login(student);ok((await read()).groups.length===1&&!JSON.stringify(await read()).includes('Private task'),'Other group tasks hidden');
 await login(outsider);await denied(read);await denied(()=>write(1));
 await db.exec('RESET ROLE');await db.query("update public.live_class_invitations set status='revoked' where session_id=$1",[session]);
 await login(student);await denied(read);
 await login(tutor);ok((await read()).roster.length===0,'Revoked learner removed from roster');await denied(()=>write(1));
 await db.exec('RESET ROLE;SET LOCAL ROLE anon');await denied(read);await denied(()=>write(1));
 await db.exec('ROLLBACK');console.log(JSON.stringify({teamsTeachingFullSchemaChecks:checks,status:'passed'}));
}
