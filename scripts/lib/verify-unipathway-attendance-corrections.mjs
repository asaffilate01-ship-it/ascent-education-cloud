import assert from 'node:assert/strict';
export async function verifyAttendanceCorrections(db){
 const id=n=>`73000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,teacher,student,peer,programme,module]=[1,2,3,4,5,6].map(id);
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const save=(s=student,status='present',date='2026-01-01')=>db.query('select public.save_unipathway_daily_mark($1,$2,$3,$4) id',[module,s,date,status]);
 await db.exec('BEGIN');
 await db.query("insert into public.tenants(id,name,slug) values($1,'Register QA','unipathway')",[tenant]);
 for(const [user,role] of [[teacher,'lecturer'],[student,'student'],[peer,'centre_director']]){
  await db.query('insert into auth.users(id,email) values($1,$2)',[user,`${user}@example.invalid`]);
  await db.query('delete from public.user_roles where user_id=$1',[user]);
  await db.query('insert into public.user_roles(user_id,tenant_id,role) values($1,$2,$3)',[user,tenant,role]);
 }
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body) values($1,$2,'Register programme','3','OTHM')",[programme,tenant]);
 await db.query("insert into public.modules(id,tenant_id,programme_id,title,lecturer_id) values($1,$2,$3,'Register module',$4)",[module,tenant,programme,teacher]);
 await db.query('insert into public.student_enrolments(student_id,tenant_id,programme_id) values($1,$2,$3)',[student,tenant,programme]);
 await login(teacher);
 const mark=(await save()).rows[0].id;
 const request=(key=id(10),status='late',reason='Arrived late after transport delay')=>db.query('select public.request_attendance_correction($1,$2,$3,$4) id',[key,mark,status,reason]);
 const review=(decision='approved',reason='Verified the classroom register',key=id(10))=>db.query('select public.review_attendance_correction($1,$2,$3) id',[key,decision,reason]);
 const list=async (after=null)=>(await db.query('select public.list_attendance_corrections($1) value',[after])).rows[0].value;
 ok((await request()).rows[0].id===id(10),'Request saved');
 ok((await request()).rows[0].id===id(10),'Request retry stable');
 await denied(()=>request(id(11)));
 await denied(()=>request(id(10),'absent'));
 await denied(()=>request(id(12),'absent','short'));
 ok((await list()).length===1,'Lecturer sees requested history');
 await denied(()=>review());
 await denied(()=>db.query('select * from public.attendance_corrections'));
 await denied(()=>db.query("update public.attendance_corrections set state='approved' where id=$1",[id(10)]));
 await db.exec('RESET ROLE');
 ok((await db.query('select status from public.attendance_records where id=$1',[mark])).rows[0].status==='present','Request leaves mark unchanged');
 await db.query("insert into public.user_roles(user_id,tenant_id,role) values($1,$2,'centre_director')",[teacher,tenant]);
 await login(teacher);await denied(()=>review());
 await login(student);await denied(()=>request());await denied(()=>review());await denied(()=>list());
 await login(peer);
 ok((await list()).length===1,'Administrator sees pending request');
 ok((await review()).rows[0].id===id(10),'Administrator approves');
 ok((await review()).rows[0].id===id(10),'Review retry stable');
 await denied(()=>review('rejected'));
 let history=(await list())[0];
 ok(history.original_status==='present'&&history.current_status==='late'&&history.state==='approved'&&history.reviewed_by===peer,'Audit retains original and new mark and reviewer');
 await login(teacher);ok((await request()).rows[0].id===id(10),'Request retry after approval is stable');
 await request(id(11),'absent');
 await login(peer);await review('rejected','The original evidence is accurate',id(11));
 history=(await list()).find(c=>c.id===id(11));ok(history.current_status==='late'&&history.state==='rejected','Rejection leaves mark unchanged');
 await login(teacher);await request(id(12),'excused');
 await db.exec('RESET ROLE');await db.query("update public.attendance_records set status='present' where id=$1",[mark]);
 await login(peer);await denied(()=>review('approved','The supporting evidence is verified',id(12)));
 await review('rejected','Mark changed; request must be renewed',id(12));
 ok((await list()).find(c=>c.id===id(12)).state==='rejected','Stale request can be rejected');
 await db.exec('RESET ROLE');
 await db.query("delete from public.user_roles where user_id=$1 and role='centre_director'",[teacher]);
 await db.query('update public.modules set lecturer_id=$1 where id=$2',[student,module]);
 await login(teacher);await denied(()=>request(id(13),'absent'));ok((await list()).length===0,'Reassigned lecturer loses request access');
 await db.exec('RESET ROLE');

 // More than one RPC page must remain accessible without omissions.
 for(let n=100;n<201;n++)await db.query(`insert into public.attendance_corrections(id,tenant_id,record_id,module_id,student_id,attendance_date,original_status,requested_status,reason,requested_by,state,reviewed_by,reviewed_at,review_reason)
 values($1,$2,$3,$4,$5,'2026-01-01','present','late','Fixture request reason',$6,'rejected',$7,now(),'Fixture review reason')`,[id(n),tenant,mark,module,student,teacher,peer]);
 await login(peer);const pageOne=await list();const pageTwo=await list(pageOne.at(-1).id);
 ok(pageOne.length===100&&pageTwo.length===4,'Keyset paging returns the complete correction history');
 ok(new Set([...pageOne,...pageTwo].map(c=>c.id)).size===104,'History pages have no duplicate IDs');
 await db.exec('RESET ROLE');
 ok((await db.query('select recorded_by from public.attendance_records where id=$1',[mark])).rows[0].recorded_by===teacher,'Correction retains original recorder');
 await db.query('delete from public.user_roles where user_id=$1',[peer]);await login(peer);await denied(()=>review());await denied(()=>list());
 await db.exec('RESET ROLE');
 await db.query("update public.tenants set slug='correction-qa-centre' where id=$1",[tenant]);
 await db.query("insert into public.tenants(id,name,slug) values($1,'Other correction QA','unipathway')",[id(20)]);
 await db.query('insert into auth.users(id,email) values($1,$2)',[id(21),'other-correction@example.invalid']);
 await db.query('delete from public.user_roles where user_id=$1',[id(21)]);
 await db.query("insert into public.user_roles(user_id,tenant_id,role) values($1,$2,'superadmin')",[id(21),id(20)]);
 await login(id(21));ok((await list()).length===0,'Other centre administrator cannot read history');await denied(()=>review());await denied(()=>request());
 await db.exec('RESET ROLE; SET LOCAL ROLE anon');await denied(()=>list());await denied(()=>request());await denied(()=>review());
 await db.exec('RESET ROLE;ROLLBACK');
 console.log(JSON.stringify({attendanceCorrectionChecks:checks,status:'passed'}));
}
