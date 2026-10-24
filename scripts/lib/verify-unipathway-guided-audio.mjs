import assert from 'node:assert/strict';
export async function verifyGuidedAudio(db){
 const id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,tutor,student,peer,programme,module,session,other,outsider]=Array.from({length:9},(_,i)=>id(i+1));
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const path=`${session}/${id(20)}.mp3`;
 const read=async()=> (await db.query('select public.get_unipathway_guided_audio($1) value',[session])).rows[0].value;
 const write=(revision,playing=false,position=0,file=path)=>db.query('select public.set_unipathway_guided_audio($1,$2,$3,$4,$5,$6) value',[session,revision,file,'Listening practice',playing,position]);
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
 await login(tutor);ok((await read()).state===null,'Empty session state');
 await denied(()=>write(0));
 await db.query("insert into storage.objects(bucket_id,name) values('guided-class-audio',$1)",[path]);
 ok((await write(0)).rows[0].value.revision===1,'Initial revision');
 await denied(()=>write(0,true));
 ok((await write(1,true,12)).rows[0].value.revision===2,'Play advances revision');
 ok((await read()).can_manage===true,'Tutor control');
 await denied(()=>write(2,false,-1));
 await denied(()=>write(2,false,1,`${id(99)}/${id(20)}.mp3`));
 await denied(()=>db.query("update public.unipathway_guided_audio set session_id=$1 where session_id=$2",[id(99),session]));
 await login(student);const value=await read();ok(value.state.playing&&Number(value.state.position_seconds)===12&&!value.can_manage,'Invited learner follows');
 ok((await db.query("select count(*)::int n from storage.objects where bucket_id='guided-class-audio'")).rows[0].n===1,'Invited learner can read audio');
 await denied(()=>write(2,false));
 await denied(()=>db.query("insert into storage.objects(bucket_id,name) values('guided-class-audio',$1)",[`${session}/${id(21)}.mp3`]));
 ok((await db.query('update public.unipathway_guided_audio set playing=false where session_id=$1 returning session_id',[session])).rows.length===0,'Learner cannot update directly');
 await login(peer);await denied(read);ok((await db.query("select count(*)::int n from storage.objects where bucket_id='guided-class-audio'")).rows[0].n===0,'Uninvited peer cannot read audio');
 await login(outsider);await denied(read);await denied(()=>write(2));
 await db.exec('RESET ROLE');await db.query("update public.live_class_invitations set status='revoked' where session_id=$1",[session]);
 await login(student);await denied(read);ok((await db.query("select count(*)::int n from storage.objects where bucket_id='guided-class-audio'")).rows[0].n===0,'Revocation blocks new audio reads');
 await db.exec('RESET ROLE;SET LOCAL ROLE anon');await denied(read);await denied(()=>write(2));
 await db.exec('ROLLBACK');console.log(JSON.stringify({guidedAudioFullSchemaChecks:checks,status:'passed'}));
}
