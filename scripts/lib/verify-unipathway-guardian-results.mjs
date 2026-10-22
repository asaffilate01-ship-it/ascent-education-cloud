import assert from 'node:assert/strict';
export async function verifyGuardianResults(db){
 const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,other,parent,student,peer,director,outsider,link,programme,module,brief,attempt]=Array.from({length:12},(_,i)=>id(i+1));
 let checks=0;
 const ok=(value,message)=>{assert.ok(value,message);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const results=async()=> (await db.query('select public.get_unipathway_guardian_results() value')).rows[0].value;
 await db.exec('BEGIN');
 await db.query("insert into public.tenants(id,name,slug) values($1,'QA A','unipathway')",[tenant]);
 for(const [user,role] of [[parent,'parent_guardian'],[student,'student'],[peer,'student'],[director,'centre_director']]){
  await db.query('insert into auth.users(id,email) values($1,$2)',[user,`${user}@example.invalid`]);
  await db.query('delete from public.user_roles where user_id=$1',[user]);
  await db.query('insert into public.user_roles(user_id,role,tenant_id) values($1,$2,$3)',[user,role,tenant]);
 }
 await db.query("update public.tenants set slug='qa-a' where id=$1",[tenant]);
 await db.query("insert into public.tenants(id,name,slug) values($1,'QA B','unipathway')",[other]);
 await db.query('insert into auth.users(id,email) values($1,$2)',[outsider,'other@example.invalid']);
 await db.query("insert into public.user_roles(user_id,role,tenant_id) values($1,'parent_guardian',$2)",[outsider,other]);
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body) values($1,$2,'QA programme','3','OTHM')",[programme,tenant]);
 await db.query("insert into public.modules(id,programme_id,tenant_id,title) values($1,$2,$3,'QA module')",[module,programme,tenant]);
 await db.query(`insert into public.unipathway_assessment_briefs(id,tenant_id,module_id,lecturer_id,title,assessment_type,teaching_summary,learning_outcomes,student_expectations,required_evidence,due_at,submission_cutoff,policy_reference)
 values($1,$2,$3,$4,'QA released coursework','coursework',repeat('Teaching evidence ',4),repeat('Learning outcome ',3),repeat('Expected evidence ',4),repeat('Required evidence ',3),now(),now(),'QA-policy')`,[brief,tenant,module,director]);
 await db.query("insert into public.unipathway_assessment_attempts(id,tenant_id,brief_id,student_id,attempt_no,evidence_text) values($1,$2,$3,$4,1,repeat('Learner evidence ',5))",[attempt,tenant,brief,student]);
 await db.query("insert into public.unipathway_assessment_released_results(attempt_id,tenant_id,student_id,brief_id,approved_mark_revision,raw_score,penalty_points,final_score,published_feedback,released_by) values($1,$2,$3,$4,1,72,0,72,'Approved individual feedback',$5)",[attempt,tenant,student,brief,director]);
 await login(parent);
 await denied(()=>db.query('insert into public.parent_student_links(parent_id,student_id,tenant_id,verified) values($1,$2,$3,true)',[parent,student,tenant]));
 await db.query('insert into public.parent_student_links(id,parent_id,student_id,tenant_id) values($1,$2,$3,$4)',[link,parent,student,tenant]);
 ok((await results())[0].student_name===null,'Unverified link must not disclose identity');
 await denied(()=>db.query('select public.set_unipathway_guardian_result_sharing($1,true)',[link]));
 await login(student);
 await denied(()=>db.query('select public.set_unipathway_guardian_result_sharing($1,true)',[link]));
 await login(director);
 await db.query('update public.parent_student_links set verified=true where id=$1',[link]);
 await login(parent);ok((await results())[0].results.length===0,'Verification alone must not release results');
 await login(peer);await denied(()=>db.query('select public.set_unipathway_guardian_result_sharing($1,true)',[link]));
 await login(student);await db.query('select public.set_unipathway_guardian_result_sharing($1,true)',[link]);
 await login(parent);const shared=(await results())[0];ok(shared.results.length===1&&shared.results[0].final_score===72,'Approved result should be shared');
 await denied(()=>db.query('insert into public.unipathway_guardian_result_consents(link_id,student_id,tenant_id) values($1,$2,$3)',[link,student,tenant]));
 await db.exec('RESET ROLE');
 await db.query("insert into public.unipathway_assessment_attempts(tenant_id,brief_id,student_id,attempt_no,evidence_text) values($1,$2,$3,2,repeat('Unreleased evidence ',5))",[tenant,brief,student]);
 await db.query("insert into public.unipathway_assessment_appeals(id,tenant_id,attempt_id,brief_id,student_id,grounds,details) values($1,$2,$3,$4,$5,'clerical_error',repeat('Reviewed correction detail ',4))",[id(20),tenant,attempt,brief,student]);
 await db.query(`insert into public.unipathway_assessment_grade_amendments(attempt_id,appeal_id,tenant_id,student_id,brief_id,original_raw_score,original_final_score,corrected_raw_score,retained_penalty_points,corrected_final_score,corrected_feedback,reviewer_id,approved_by)
 values($1,$2,$3,$4,$5,72,72,78,0,78,'Corrected approved feedback',$6,$7)`,[attempt,id(20),tenant,student,brief,peer,director]);
 await login(parent);const amended=(await results())[0].results;
 ok(amended.length===1,'Unreleased attempts must remain private');
 ok(amended[0].final_score===78&&amended[0].feedback==='Corrected approved feedback'&&amended[0].amended,'Use approved amendment instead of stale original');
 await login(outsider);ok((await results()).length===0,'Other tenant must see no links');
 await denied(()=>db.query('insert into public.parent_student_links(parent_id,student_id,tenant_id) values($1,$2,$3)',[outsider,student,other]));
 await login(student);await db.query('select public.set_unipathway_guardian_result_sharing($1,false)',[link]);
 await login(parent);ok((await results())[0].results.length===0,'Revocation takes effect on next read');
 await login(student);await db.query('select public.set_unipathway_guardian_result_sharing($1,true)',[link]);
 await login(director);await db.query('update public.parent_student_links set verified=false where id=$1',[link]);await db.query('update public.parent_student_links set verified=true where id=$1',[link]);
 await login(parent);ok((await results())[0].sharing===false,'Reverification must not revive consent');
 await db.exec('RESET ROLE;SET LOCAL ROLE anon');await denied(()=>db.query('select public.get_unipathway_guardian_results()'));
 await db.exec('ROLLBACK');
 console.log(JSON.stringify({guardianFullSchemaChecks:checks,status:'passed'}));
}
