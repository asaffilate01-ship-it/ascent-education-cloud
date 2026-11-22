import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [centre, foreign, learner, tutor, director, guardian, unrelated, newTutor,
 wrongCentre, programmeLead, mixed, legacyTutor, otherLearner, foreignTutor, globalAdmin] =
 Array.from({length:15}, (_, i) => id(i + 1));
const [programme, anotherProgramme, module, otherModule, plan, foreignPlan, link] =
 Array.from({length:7}, (_, i) => id(i + 30));
const [shared, internal, replacement] = [id(50),id(51),id(52)];
let checks = 0;

try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE SCHEMA unipathway_acl;
 CREATE TYPE public.app_role AS ENUM ('student','parent_guardian','lecturer','centre_director','programme_leader','finance_officer','superadmin');
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid,full_name text NOT NULL DEFAULT 'Synthetic learner');
 CREATE TABLE public.user_roles(user_id uuid NOT NULL,tenant_id uuid,role public.app_role NOT NULL);
 CREATE TABLE public.programmes(id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid,title text NOT NULL DEFAULT 'Synthetic module');
 CREATE TABLE public.student_enrolments(student_id uuid,tenant_id uuid,programme_id uuid,status text);
 CREATE TABLE public.unipathway_learning_plans(id uuid PRIMARY KEY,module_id uuid,student_id uuid);
 CREATE TABLE public.parent_student_links(id uuid PRIMARY KEY,tenant_id uuid,parent_id uuid,student_id uuid,verified boolean NOT NULL);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
   SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 $$;
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.unipathway_learning_plans ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA auth,public,unipathway_acl TO authenticated,anon,service_role;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`);
 // Reuse the real consent table and trigger from the legacy-compatible activation.
 const legacy = readFileSync(new URL('../supabase/migrations/20261026075353_tuition_live_workflows.sql',import.meta.url),'utf8');
 await db.exec(legacy.slice(legacy.indexOf('CREATE TABLE public.unipathway_learning_shares'),
                           legacy.indexOf('CREATE FUNCTION public.set_unipathway_learning_share')));
 await db.exec(readFileSync(new URL('./activation/unipathway-tuition-reports-forward.sql',import.meta.url),'utf8'));
 for (const [actor,tenant,role,roleTenant] of [
  [learner,centre,'student',centre],[tutor,centre,'lecturer',centre],[director,centre,'centre_director',centre],
  [guardian,centre,'parent_guardian',centre],[unrelated,centre,'parent_guardian',centre],[newTutor,centre,'lecturer',centre],
  [wrongCentre,foreign,'centre_director',foreign],[programmeLead,centre,'programme_leader',centre],
  [mixed,centre,'lecturer',centre],[legacyTutor,centre,'lecturer',null],[otherLearner,foreign,'student',foreign],
  [foreignTutor,foreign,'lecturer',foreign],[globalAdmin,centre,'superadmin',null],
 ]) {
  await db.query('insert into profiles(user_id,tenant_id) values ($1,$2)',[actor,tenant]);
  await db.query('insert into user_roles values ($1,$2,$3)',[actor,roleTenant,role]);
 }
 await db.query("insert into user_roles values($1,$2,'parent_guardian')",[mixed,centre]);
 await db.query('insert into programmes values ($1,$2),($3,$4)',[programme,centre,anotherProgramme,foreign]);
 await db.query('insert into modules(id,tenant_id,programme_id,lecturer_id) values ($1,$2,$3,$4),($5,$6,$7,$8)',[module,centre,programme,tutor,otherModule,foreign,anotherProgramme,foreignTutor]);
 await db.query("insert into student_enrolments values ($1,$2,$3,'active'),($4,$5,$6,'active')",[learner,centre,programme,otherLearner,foreign,anotherProgramme]);
 await db.query('insert into unipathway_learning_plans values($1,$2,$3),($4,$5,$6)',[plan,module,learner,foreignPlan,otherModule,otherLearner]);
 await db.query('insert into parent_student_links values($1,$2,$3,$4,true)',[link,centre,guardian,learner]);

 async function as(actor,query,args=[],role='authenticated'){
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor ?? '']);
  await db.exec('SET ROLE '+role);
  try { return (await db.query(query,args)).rows[0]?.result; }
  finally { await db.exec('RESET ROLE'); }
 }
 const read = (actor, planId=plan, role) => as(actor,'select public.get_unipathway_tuition_reports($1) result',[planId],role);
 const add = (actor, report, audience='shared', options={}) => as(actor,
  'select public.add_unipathway_tuition_report($1,$2,$3,$4,$5,$6,$7,$8) result',
  [options.plan ?? plan, report, options.summary === undefined ? 'Practised two worked examples.' : options.summary,
   options.strength ?? 'Clear working',options.focus ?? null,options.next ?? 'Try another example',
   options.concern === undefined ? 'practice_gap' : options.concern,audience]);
 const sharingDenied = /Tuition report sharing is unavailable/;
 const share = (actor,enabled,planId=plan,linkId=link) => as(actor,
  'select public.set_unipathway_tuition_report_share($1,$2,$3) result',[planId,linkId,enabled]);
 const options = (actor,planId=plan) => as(actor,'select public.get_unipathway_tuition_report_share_options($1) result',[planId]);
 const roster = actor => as(actor,'select public.get_unipathway_tuition_director_roster() result');
 const denied = /Tuition report access is unavailable/;
 const confirm = async (fn, error=denied)=>{await assert.rejects(fn,error);checks++;};
 const eq = (actual, expected)=>{assert.deepEqual(actual,expected);checks++;};

 eq(await read(tutor),[]);
 await confirm(()=>read(guardian));
 await db.query("update profiles set full_name='Synthetic guardian' where user_id=$1",[guardian]);
 await db.query("update modules set title='Other centre module' where id=$1",[otherModule]);
 eq(await roster(director),[{id:plan,module_title:'Synthetic module',student_name:'Synthetic learner'}]);
 eq(await roster(wrongCentre),[{id:foreignPlan,module_title:'Other centre module',student_name:'Synthetic learner'}]);
 for(const actor of [tutor,learner,guardian,programmeLead,globalAdmin,mixed,null])
  await confirm(()=>roster(actor));
 eq(await options(learner),[]);
 await confirm(()=>share(learner,true),sharingDenied);
 await db.query('insert into unipathway_learning_shares values($1,$2)',[plan,link]);
 eq(await options(learner),[{id:link,name:'Synthetic guardian',shared:false}]);
 await confirm(()=>read(guardian));
 await confirm(()=>share(guardian,true),sharingDenied);
 await confirm(()=>share(director,true),sharingDenied);
 await confirm(()=>options(tutor),sharingDenied);
 await confirm(()=>options(learner,foreignPlan),sharingDenied);
 await confirm(()=>share(learner,true,plan,id(899)),sharingDenied);
 await confirm(()=>share(learner,null),sharingDenied);
 await share(learner,true); checks++;
 await share(learner,true); checks++;
 eq(await options(learner),[{id:link,name:'Synthetic guardian',shared:true}]);
 await confirm(()=>options(guardian),sharingDenied);
 eq(await add(tutor,shared),shared);
 eq(await add(tutor,shared),shared);
 eq(await add(tutor,internal,'staff',{summary:'Internal educational note.'}),internal);
 await confirm(()=>add(tutor,shared,'staff'),/could not be confirmed/);
 await confirm(()=>add(tutor,shared,'shared',{summary:'Changed'}),/could not be confirmed/);
 eq((await read(tutor)).map(r=>r.id).sort(),[shared,internal]);
 eq((await read(director)).map(r=>r.id).sort(),[shared,internal]);
 eq((await read(learner)).map(r=>r.id),[shared]);
 eq((await read(guardian)).map(r=>r.id),[shared]);
 eq(Object.keys((await read(guardian))[0]).sort(),
    ['id','created_at','summary','strength','focus','next_action','concern','audience'].sort());
 await confirm(()=>add(director,replacement));
 await confirm(()=>add(learner,replacement));
 await confirm(()=>add(guardian,replacement));
 for(const actor of [unrelated,newTutor,wrongCentre,foreignTutor,programmeLead,legacyTutor,globalAdmin,mixed,null])
  await confirm(()=>read(actor));
 await confirm(()=>read(tutor,id(999)));
 await confirm(()=>read(tutor,foreignPlan));
 await confirm(()=>read(guardian,plan,'anon'),/permission denied/);
 await confirm(()=>read(tutor,plan,'service_role'),/permission denied/);
 for(const role of ['anon','authenticated','service_role']){
  await confirm(()=>as(tutor,'select id from public.unipathway_tuition_reports',[],role),/permission denied/);
  await confirm(()=>as(tutor,'select * from unipathway_acl.tuition_report_scope($1)',[plan],role),/permission denied/);
 }
 await confirm(()=>as(tutor,'update public.unipathway_tuition_reports set summary=\'Changed\''),/permission denied/);
 await confirm(()=>as(tutor,'delete from public.unipathway_tuition_reports'),/permission denied/);
 for(const role of ['anon','authenticated','service_role'])
  await confirm(()=>as(learner,'select * from public.unipathway_tuition_report_shares',[],role),/permission denied/);
 await confirm(()=>as(tutor,'truncate public.unipathway_tuition_reports'),/permission denied/);
 await confirm(()=>as(tutor,'insert into public.unipathway_tuition_reports default values'),/permission denied/);
 await confirm(()=>add(tutor,replacement,'other'),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,null),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,'shared',{summary:' '.repeat(15)}),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,'shared',{summary:'\t\n'}),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,'shared',{summary:'x'.repeat(1001)}),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,'shared',{focus:'x'.repeat(1001)}),/Check the tuition report fields/);
 await confirm(()=>add(tutor,replacement,'staff',{concern:'health'}),/Check the tuition report fields/);

 // An assigned lecturer / guardian still cannot use an ambiguous role to see staff notes.
 await db.query('update modules set lecturer_id=$1 where id=$2',[mixed,module]);
 await confirm(()=>read(mixed)); await confirm(()=>add(mixed,replacement));
 await db.query('update modules set lecturer_id=$1 where id=$2',[legacyTutor,module]);
 await confirm(()=>read(legacyTutor)); await confirm(()=>add(legacyTutor,replacement));
 await db.query('update modules set lecturer_id=$1 where id=$2',[newTutor,module]);
 await confirm(()=>read(tutor)); await confirm(()=>add(tutor,shared));
 eq((await read(newTutor)).length,2);
 await confirm(()=>add(newTutor,shared),/could not be confirmed/);
 eq(await add(newTutor,replacement,'shared',{summary:'x'.repeat(1000),concern:null}),replacement);

 await share(learner,false); checks++;
 await share(learner,false); checks++;
 eq(await options(learner),[{id:link,name:'Synthetic guardian',shared:false}]);
 await confirm(()=>read(guardian));
 eq((await read(learner)).length,2); // report revocation is guardian-only
 await share(learner,true); checks++;
 await db.query('update parent_student_links set verified=false where id=$1',[link]);
 await confirm(()=>read(guardian));
 eq(await options(learner),[]);
 await confirm(()=>share(learner,true),sharingDenied);
 await db.query('update parent_student_links set verified=true where id=$1',[link]);
 await confirm(()=>read(guardian)); // the real consent trigger cleared the old grant
 await db.query('insert into unipathway_learning_shares values($1,$2)',[plan,link]);
 await confirm(()=>read(guardian)); // re-verification plus baseline alone is insufficient
 eq(await options(learner),[{id:link,name:'Synthetic guardian',shared:false}]);
 await share(learner,true); checks++;
 eq((await read(guardian)).length,2);
 await db.query('delete from unipathway_learning_shares where plan_id=$1 and link_id=$2',[plan,link]);
 await confirm(()=>read(guardian));
 await db.query('insert into unipathway_learning_shares values($1,$2)',[plan,link]);
 await confirm(()=>read(guardian)); // cascade, then a new baseline, still default off
 await share(learner,true); checks++;
 await db.query('update profiles set tenant_id=$1 where user_id=$2',[foreign,guardian]);
 await confirm(()=>read(guardian));
 await db.query('update profiles set tenant_id=$1 where user_id=$2',[centre,guardian]);
 await db.query("update student_enrolments set status='withdrawn' where student_id=$1",[learner]);
 for(const actor of [learner,guardian,director,newTutor])await confirm(()=>read(actor));
 await confirm(()=>add(newTutor,id(80)));
 eq(await roster(director),[]);
 // A different active enrolment in the same centre cannot unlock this plan.
 await db.query('insert into programmes values($1,$2)',[id(81),centre]);
 await db.query("insert into student_enrolments values($1,$2,$3,'active')",[learner,centre,id(81)]);
 for(const actor of [learner,guardian,director,newTutor])await confirm(()=>read(actor));
 await db.query("update student_enrolments set status='active' where student_id=$1",[learner]);
 await db.query("update user_roles set tenant_id=null where user_id=$1",[learner]);
 for(const actor of [learner,guardian,director,newTutor])await confirm(()=>read(actor));
 await db.query("update user_roles set tenant_id=$1 where user_id=$2",[centre,learner]);

 for(let n=100;n<124;n++)eq(await add(newTutor,id(n),n%2===0?'staff':'shared'),id(n));
 // Pin times to make ties deterministic and independent of the DB clock.
 await db.exec("update public.unipathway_tuition_reports set created_at='2026-01-01T00:00:00Z'");
 eq((await read(newTutor)).map(r=>r.id),Array.from({length:20},(_,n)=>id(123-n)));
 eq((await read(guardian)).map(r=>r.id),[
   ...Array.from({length:12},(_,n)=>id(123-2*n)),replacement,shared,
 ]);
 eq((await read(learner)).every(r=>r.audience==='shared'),true);

 // Withdraw from an older contributor as the now-assigned tutor. Use an
 // known report so the family list proves the row was visible first.
 const oldReport = shared;
 const withdraw = (actor,report,planId=plan,role) => as(actor,
  'select public.withdraw_unipathway_tuition_report($1,$2) result',[planId,report],role);
 const audit = async report => (await db.query(
  'select summary,authored_by,withdrawn_by,withdrawn_at::text from public.unipathway_tuition_reports where id=$1',
  [report])).rows[0];
 eq((await read(learner)).some(r=>r.id===oldReport),true);
 eq((await read(guardian)).some(r=>r.id===oldReport),true);
 for(const actor of [learner,guardian,director,tutor,mixed,wrongCentre,unrelated,null])
  await confirm(()=>withdraw(actor,oldReport));
 await confirm(()=>withdraw(newTutor,id(999)));
 await confirm(()=>withdraw(newTutor,null));
 await confirm(()=>withdraw(newTutor,oldReport,foreignPlan));
 await confirm(()=>withdraw(newTutor,id(999),foreignPlan));
 // A tutor authorised for a different real plan still gets a neutral denial.
 await confirm(()=>withdraw(foreignTutor,oldReport,foreignPlan));
 await confirm(()=>withdraw(newTutor,oldReport,plan,'anon'),/permission denied/);
 await confirm(()=>withdraw(newTutor,oldReport,plan,'service_role'),/permission denied/);
 await confirm(()=>as(newTutor,'update public.unipathway_tuition_reports set withdrawn_at=null'),/permission denied/);
 eq(await withdraw(newTutor,oldReport),oldReport);
 const firstAudit=await audit(oldReport);
 eq(firstAudit.summary,'Practised two worked examples.');
 eq(firstAudit.authored_by,tutor);
 eq(firstAudit.withdrawn_by,newTutor);
 eq(Boolean(firstAudit.withdrawn_at),true);
 eq(await withdraw(newTutor,oldReport),oldReport);
 eq(await audit(oldReport),firstAudit);
 for(const actor of [newTutor,director,learner,guardian])
  eq((await read(actor)).some(r=>r.id===oldReport),false);
 // Withdrawn IDs do not update or return from the add operation, even if
 // the original author is properly assigned again with the exact payload.
 await db.query('update modules set lecturer_id=$1 where id=$2',[tutor,module]);
 await confirm(()=>add(tutor,oldReport),/could not be confirmed/);
 eq(await withdraw(tutor,oldReport),oldReport); // current authorisation required for replay
 eq(await audit(oldReport),firstAudit); // first withdrawal remains attributable
 await confirm(()=>withdraw(newTutor,oldReport));
 eq((await read(learner)).some(r=>r.id===oldReport),false);
 // Most recent internal report is normally visible only to staff; withdrawal
 // hides it from their report reads as well, without erasing it.
 const staffReport=id(122);
 eq((await read(tutor)).some(r=>r.id===staffReport),true);
 eq(await withdraw(tutor,staffReport),staffReport);
 eq((await read(tutor)).some(r=>r.id===staffReport),false);
 eq((await read(director)).some(r=>r.id===staffReport),false);


 console.log(`Tuition reports: ${checks} local Postgres RPC, isolation, consent, bounds and retry checks passed`);
} finally {
 await db.close();
}
