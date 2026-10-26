import assert from 'node:assert/strict';
export async function verifyCourseworkOnly(db,{verifyIqaRevision=false}={}){
 const id=n=>`81000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [tenant,student,peer,lecturer,manager,marker,qa,root,programme,module,brief,draft]=Array.from({length:12},(_,i)=>id(i+1));
 let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const login=async user=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async fn=>{await db.exec('SAVEPOINT denied');await assert.rejects(fn);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const rpc=async(sql,args=[])=> (await db.query(sql,args)).rows[0]?.value;
 const evidence='Original coursework evidence includes calculations, observations and source references.';
 await db.exec('BEGIN');
 await db.query("insert into public.tenants(id,name,slug) values($1,'Coursework QA','unipathway')",[tenant]);
 for(const [user,role] of [[student,'student'],[peer,'student'],[lecturer,'lecturer'],[manager,'programme_leader'],[marker,'assessor'],[qa,'iqa_officer'],[root,'superadmin']]){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[user,`${user}@example.invalid`]);
  await db.query('delete from public.user_roles where user_id=$1',[user]);
  await db.query('insert into public.user_roles(user_id,tenant_id,role) values($1,$2,$3)',[user,tenant,role]);
 }
 await db.query("insert into public.programmes(id,tenant_id,title,level,awarding_body) values($1,$2,'Evidence programme','3','OTHM')",[programme,tenant]);
 await db.query("insert into public.modules(id,programme_id,tenant_id,title,lecturer_id) values($1,$2,$3,'Evidence module',$4)",[module,programme,tenant,lecturer]);
 await db.query('insert into public.student_enrolments(student_id,programme_id,tenant_id) values($1,$2,$3)',[student,programme,tenant]);
 await db.query("insert into public.unipathway_assessment_briefs(id,tenant_id,module_id,lecturer_id,title,assessment_type,teaching_summary,learning_outcomes,student_expectations,required_evidence,due_at,submission_cutoff,policy_reference) values($1,$2,$3,$4,'Evidence assignment','coursework',$5,$5,$5,$5,now()+interval '1 day',now()+interval '2 days','QA-POLICY')",[brief,tenant,module,lecturer,evidence]);
 await db.query("insert into public.unipathway_assessment_criteria(tenant_id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order) values($1,$2,'LO1','Explain evidence and observations',$3,$3,50,1),($1,$2,'LO2','Evaluate evidence and observations',$3,$3,50,2)",[tenant,brief,evidence]);
 await login(manager);await db.query('select public.publish_unipathway_assessment_brief($1)',[brief]);
 const reserve=(name='evidence.pdf',mime='application/pdf',size=120)=>rpc('select row_to_json(public.reserve_unipathway_coursework_file($1,$2,$3,$4)) value',[brief,name,mime,size]);
 const submit=(uploads,request=id(30),text=evidence)=>rpc('select public.submit_unipathway_coursework($1,$2,$3,$4) value',[brief,text,uploads,request]);
 await login(peer);await denied(()=>reserve());
 await login(student);await denied(()=>reserve('script.exe','application/octet-stream'));await denied(()=>reserve('large.pdf','application/pdf',20971521));
 const file=await reserve();ok(file.student_id===student,'Owner is assigned from authenticated identity');
 await denied(()=>submit([file.id]));
 await denied(()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('unipathway-coursework','forged/path','{}')"));
 await db.query("insert into storage.objects(bucket_id,name,metadata) values('unipathway-coursework',$1,$2)",[file.storage_path,JSON.stringify({size:120,mimetype:'application/pdf'})]);
 await denied(()=>db.query('select public.discard_unipathway_coursework_file($1)',[file.id]));
 await login(peer);ok((await db.query('select * from public.unipathway_coursework_uploads')).rows.length===0,'Peer cannot read private manifest');
 ok((await db.query("select * from storage.objects where bucket_id='unipathway-coursework'")).rows.length===0,'Peer cannot download object');
 await denied(()=>db.query('select public.discard_unipathway_coursework_file($1)',[file.id]));
 await login(student);const attempt=await submit([file.id]);ok(!!attempt,'Completed upload submitted');
 ok(await submit([file.id])===attempt,'Same request returns original attempt');
 await denied(()=>submit([file.id],id(30),evidence+' changed'));await denied(()=>submit([file.id],id(31)));
 ok((await db.query("delete from storage.objects where bucket_id='unipathway-coursework' returning id")).rows.length===0,'Submitted file cannot be deleted');
 ok((await db.query("update storage.objects set metadata='{}' where bucket_id='unipathway-coursework' returning id")).rows.length===0,'Submitted file cannot be overwritten');
 await denied(()=>db.query('select public.discard_unipathway_coursework_file($1)',[file.id]));
 await login(marker);ok((await db.query('select * from public.unipathway_coursework_uploads')).rows.length===0,'Unallocated marker has no file access');
 await login(manager);await db.query('select public.allocate_unipathway_independent_marker($1,$2,$3)',[attempt,marker,qa]);
 for(const reviewer of [marker,qa]){await login(reviewer);ok((await db.query("select * from storage.objects where bucket_id='unipathway-coursework'")).rows.length===1,'Allocated reviewer can download evidence');}
 await login(lecturer);ok((await db.query('select * from public.unipathway_coursework_uploads')).rows.length===0,'Teaching lecturer has no marking evidence access');
 if(verifyIqaRevision){
  const marks=JSON.stringify(['LO1','LO2'].map(code=>({code,points:40,reason:'Evidence explains each observation and supports a reasoned conclusion.',evidence:'Original coursework evidence',missing:'No required evidence missing'})));
  const review=(revision,action)=>db.query('select public.review_uni_mark_revision($1,$2,$3,$4)',[attempt,revision,action,'I checked the submitted evidence against the published rubric.']);
  await login(marker);await db.query('select public.record_unipathway_human_mark($1,$2,$3)',[attempt,marks,'Your evidence supports a clear conclusion. Next time compare the alternative approaches in more detail.']);
  await denied(()=>review(1,'approve'));
  await login(qa);await denied(()=>review(0,'approve'));await denied(()=>review(1,'release'));await denied(()=>review(1,'unknown'));
  await review(1,'return');checks++;
  await login(marker);await db.query('select public.record_unipathway_human_mark($1,$2,$3)',[attempt,marks,'Revised feedback explains the strengths in your evidence and the improvements needed for your next assessment.']);
  await login(qa);await denied(()=>review(1,'approve'));await review(2,'approve');checks++;
  await denied(()=>review(1,'release'));await review(2,'release');checks++;await denied(()=>review(2,'release'));
  await login(student);ok((await db.query('select * from unipathway_assessment_released_results where attempt_id=$1',[attempt])).rows.length===1,'Only the checked approved revision is released');
  await login(peer);ok((await db.query('select * from unipathway_assessment_released_results where attempt_id=$1',[attempt])).rows.length===0,'Peers cannot read released results');
 }
 await db.exec('ROLLBACK');console.log(JSON.stringify({courseworkOnlyChecks:checks,status:'passed'}));
}
