// Synthetic PGlite security rehearsal only. Do NOT connect to hosted Supabase/Dishbee.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),q=sql=>db.query(sql);
const u={
 a:'10000000-0000-4000-8000-000000000001',
 b:'10000000-0000-4000-8000-000000000002',
 officerA:'20000000-0000-4000-8000-000000000001',
 officerB:'20000000-0000-4000-8000-000000000002',
 directorA:'20000000-0000-4000-8000-000000000003',
 student1:'20000000-0000-4000-8000-000000000004',
 student2:'20000000-0000-4000-8000-000000000005',
 student3:'20000000-0000-4000-8000-000000000006',
 otherStudent:'20000000-0000-4000-8000-000000000007',
 offProgramme:'20000000-0000-4000-8000-000000000008',
 eventA:'30000000-0000-4000-8000-000000000001',
 eventB:'30000000-0000-4000-8000-000000000002',
 programA:'30000000-0000-4000-8000-000000000003',
 programB:'30000000-0000-4000-8000-000000000004',
 programOther:'30000000-0000-4000-8000-000000000005',
 req1:'40000000-0000-4000-8000-000000000001',
 req2:'40000000-0000-4000-8000-000000000002',
 req3:'40000000-0000-4000-8000-000000000003',
 req4:'40000000-0000-4000-8000-000000000004',
 req5:'40000000-0000-4000-8000-000000000005',
 req6:'40000000-0000-4000-8000-000000000006',
 req7:'40000000-0000-4000-8000-000000000007',
 req8:'40000000-0000-4000-8000-000000000008',
 req9:'40000000-0000-4000-8000-000000000009',
};
const id=x=>x?"'"+x+"'::uuid":'NULL',textVal=x=>x===null?'NULL':"'"+x+"'";
let checks=0;
const body=r=>typeof r.rows[0].value==='string'?JSON.parse(r.rows[0].value):r.rows[0].value;
await db.exec(`
CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM('exams_officer','centre_director','student');
CREATE TABLE public.tenants(id uuid PRIMARY KEY,status text NOT NULL);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid NOT NULL);
CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
CREATE TABLE public.programmes(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,status text NOT NULL);
CREATE TABLE public.student_enrolments(student_id uuid,tenant_id uuid,programme_id uuid,status text);
CREATE TABLE public.academic_events(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,event_type text NOT NULL,
 start_date timestamptz NOT NULL,end_date timestamptz,location text,all_day boolean NOT NULL DEFAULT false);
INSERT INTO public.tenants VALUES('${u.a}','active'),('${u.b}','active');
INSERT INTO public.profiles VALUES
 ('${u.officerA}','${u.a}'),('${u.officerB}','${u.b}'),('${u.directorA}','${u.a}'),
 ('${u.student1}','${u.a}'),('${u.student2}','${u.a}'),('${u.student3}','${u.a}'),
 ('${u.otherStudent}','${u.b}'),('${u.offProgramme}','${u.a}');
INSERT INTO public.user_roles VALUES
 ('${u.officerA}','${u.a}','exams_officer'),('${u.officerB}','${u.b}','exams_officer'),
 ('${u.directorA}','${u.a}','centre_director'),('${u.student1}','${u.a}','student');
INSERT INTO public.programmes VALUES
 ('${u.programA}','${u.a}','active'),('${u.programB}','${u.a}','active'),
 ('${u.programOther}','${u.b}','active');
INSERT INTO public.student_enrolments VALUES
 ('${u.student1}','${u.a}','${u.programA}','active'),
 ('${u.student2}','${u.a}','${u.programA}','active'),
 ('${u.student3}','${u.a}','${u.programA}','active'),
 ('${u.otherStudent}','${u.b}','${u.programOther}','active'),
 ('${u.offProgramme}','${u.a}','${u.programB}','active');
INSERT INTO public.academic_events VALUES
 ('${u.eventA}','${u.a}','exam','2026-12-01T09:00:00Z','2026-12-01T12:00:00Z','Room A',false),
 ('${u.eventB}','${u.b}','exam','2026-12-02T09:00:00Z','2026-12-02T12:00:00Z','Room B',false);
`);
await db.exec(readFileSync('scripts/activation/unipathway-exam-operations-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-exam-roster-forward.sql','utf8'));
await q(`INSERT INTO unipathway_examops.session_plans(
 tenant_id,event_id,event_start,event_end,event_location,room_capacity,planned_candidates,
 planned_invigilators,seating_process_checked,entry_list_process_checked,identity_process_checked,
 emergency_process_checked,status,revision,updated_by,submitted_by,approved_by
 ) VALUES
 ('${u.a}','${u.eventA}','2026-12-01T09:00:00Z','2026-12-01T12:00:00Z','Room A',3,2,
  1,true,true,true,true,'internally_approved',3,'${u.officerA}','${u.officerA}','${u.directorA}'),
 ('${u.b}','${u.eventB}','2026-12-02T09:00:00Z','2026-12-02T12:00:00Z','Room B',3,2,
  1,true,true,true,true,'internally_approved',3,'${u.officerB}','${u.officerB}','${u.directorA}')`);
async function as(actor,sql,role='authenticated'){
 await db.exec('RESET ROLE');await q(`SELECT set_config('test.uid','${actor||''}',false)`);
 await db.exec(`SET ROLE ${role}`);
 try{return await q(sql);}finally{await db.exec('RESET ROLE');}
}
async function deny(actor,sql,role='authenticated'){
 await assert.rejects(()=>as(actor,sql,role),
 /required|denied|permission|invalid|roster|stale|seat|limit|enrolment|programme|duplicate|unique|not found|matching|attestation|approved|locked|relation|identifier|private/i);
 checks++;
}
const read=(tenant,event)=>`SELECT public.get_unipathway_exam_roster(${id(tenant)},${id(event)}) AS value`;
const act=(tenant,event,action,rev,req,prog=null,student=null,seat=null,attested=null)=>
 `SELECT public.mutate_unipathway_exam_roster(${id(tenant)},${id(event)},'${action}',
 ${id(prog)},${id(student)},${textVal(seat)},${attested===null?'NULL':attested?'true':'false'},
 ${rev},${id(req)}) AS value`;
const command=(actor,tenant,event,action,rev,req,prog=null,student=null,seat=null,attested=null)=>
 as(actor,act(tenant,event,action,rev,req,prog,student,seat,attested)).then(body);
await deny(u.officerA,read(u.a,u.eventA));
await deny(u.directorA,act(u.a,u.eventA,'bind',0,u.req1,u.programA));
const defaults=(await q('SELECT * FROM unipathway_exam_roster.activation_gate')).rows[0];
assert.deepEqual({reads:defaults.reads_enabled,writes:defaults.writes_enabled},{reads:false,writes:false});checks++;
await q('UPDATE unipathway_examops.activation_gate SET reads_enabled=true,writes_enabled=true');
await q('UPDATE unipathway_exam_roster.activation_gate SET reads_enabled=true');
const empty=body(await as(u.officerA,read(u.a,u.eventA)));
assert.equal(empty.status,'unconfigured');assert.equal(empty.planned_candidates,2);checks++;
await deny(u.officerA,act(u.a,u.eventA,'assign',0,u.req2,null,u.student1,'A1',true));
await deny(u.officerB,read(u.a,u.eventA));
await deny(u.student1,read(u.a,u.eventA));
await deny(u.directorA,read(u.b,u.eventB));
await deny(u.officerA,'SELECT * FROM unipathway_exam_roster.rosters');
await deny(u.officerA,'SELECT student_id FROM unipathway_exam_roster.seats');
await deny(u.officerA,'SELECT * FROM unipathway_exam_roster.receipts');
await deny(u.officerA,'SELECT * FROM unipathway_exam_roster.audit');
await deny(u.officerA,read(u.a,u.eventA),'anon');
await q('UPDATE unipathway_exam_roster.activation_gate SET writes_enabled=true');
await deny(u.officerA,act(u.a,u.eventA,'bind',0,u.req1,u.programA));
await deny(u.directorA,act(u.a,u.eventA,'bind',0,u.req1,u.programOther));
await deny(u.directorA,act(u.b,u.eventB,'bind',0,u.req1,u.programA));
const mapped=await command(u.directorA,u.a,u.eventA,'bind',0,u.req1,u.programA);
assert.deepEqual({status:mapped.status,revision:mapped.revision},{status:'draft',revision:1});checks++;
assert.deepEqual(await command(u.directorA,u.a,u.eventA,'bind',0,u.req1,u.programA),mapped);checks++;
await deny(u.directorA,act(u.a,u.eventA,'bind',0,u.req1,u.programB));
await deny(u.officerA,act(u.a,u.eventA,'assign',1,u.req2,null,u.otherStudent,'A1',true));
await deny(u.officerA,act(u.a,u.eventA,'assign',1,u.req2,null,u.offProgramme,'A1',true));
await deny(u.officerA,act(u.a,u.eventA,'assign',1,u.req2,null,u.student1,'A1',false));
const seat1=await command(u.officerA,u.a,u.eventA,'assign',1,u.req2,null,u.student1,'A1',true);
assert.equal(seat1.revision,2);checks++;
assert.deepEqual(await command(u.officerA,u.a,u.eventA,'assign',1,u.req2,null,u.student1,'a1',true),seat1);checks++;
await deny(u.officerA,act(u.a,u.eventA,'assign',1,u.req2,null,u.student1,'B1',true));
await deny(u.directorA,act(u.a,u.eventA,'bind',2,u.req3,u.programB));
const seat2=await command(u.officerA,u.a,u.eventA,'assign',2,u.req3,null,u.student2,'A2',true);
assert.equal(seat2.revision,3);checks++;
await deny(u.officerA,act(u.a,u.eventA,'assign',3,u.req4,null,u.student3,'A2',true));
await deny(u.officerA,act(u.a,u.eventA,'assign',3,u.req4,null,u.student3,'A3',true));
await deny(u.officerA,act(u.a,u.eventA,'assign',3,u.req4,null,u.student1,'???',true));
const roster=body(await as(u.officerA,read(u.a,u.eventA)));
assert.equal(roster.status,'draft');assert.equal(roster.seats.length,2);
assert.deepEqual(roster.seats.map(x=>x.seat_label),['A1','A2']);
assert.ok(roster.seats.every(x=>x.student_ref.startsWith('••••')&&!x.student_ref.includes('-')));
assert.equal(JSON.stringify(roster).includes(u.student1),false);checks++;
await deny(u.officerA,act(u.a,u.eventA,'submit',2,u.req4));
const removed=await command(u.officerA,u.a,u.eventA,'remove',3,u.req4,null,null,'A2');
assert.equal(removed.revision,4);checks++;
await deny(u.officerA,act(u.a,u.eventA,'submit',4,u.req5));
const reassigned=await command(u.officerA,u.a,u.eventA,'assign',4,u.req5,null,u.student2,'B1',true);
assert.equal(reassigned.revision,5);checks++;
await q(`UPDATE public.student_enrolments SET status='inactive' WHERE student_id=${id(u.student2)}`);
await deny(u.officerA,act(u.a,u.eventA,'submit',5,u.req6));
await q(`UPDATE public.student_enrolments SET status='active' WHERE student_id=${id(u.student2)}`);
const submitted=await command(u.officerA,u.a,u.eventA,'submit',5,u.req6);
assert.equal(submitted.status,'submitted');assert.equal(submitted.revision,6);checks++;
await deny(u.officerA,act(u.a,u.eventA,'remove',6,u.req7,null,null,'A1'));
await deny(u.officerA,act(u.a,u.eventA,'approve',6,u.req7));
await deny(u.directorA,act(u.a,u.eventA,'approve',5,u.req7));
await q(`UPDATE public.academic_events SET location='Different room' WHERE id=${id(u.eventA)}`);
await deny(u.directorA,act(u.a,u.eventA,'approve',6,u.req7));
await q(`UPDATE public.academic_events SET location='Room A' WHERE id=${id(u.eventA)}`);
const approved=await command(u.directorA,u.a,u.eventA,'approve',6,u.req7);
assert.equal(approved.status,'internally_approved');assert.equal(approved.revision,7);checks++;
assert.deepEqual(await command(u.directorA,u.a,u.eventA,'approve',6,u.req7),approved);checks++;
await deny(u.officerA,act(u.a,u.eventA,'assign',7,u.req8,null,u.student3,'A3',true));
await deny(u.directorA,act(u.a,u.eventA,'approve',7,u.req8));
const final=body(await as(u.officerA,read(u.a,u.eventA)));
assert.equal(final.status,'internally_approved');assert.equal(final.seats.length,2);checks++;
const events=(await q(`SELECT action FROM unipathway_exam_roster.audit WHERE tenant_id=${id(u.a)} ORDER BY id`)).rows.map(x=>x.action);
assert.deepEqual(events,['bind','assign','assign','remove','assign','submit','approve']);checks++;
// Every new request must re-check centre status and current role membership.
await q(`DELETE FROM public.user_roles WHERE user_id=${id(u.officerA)}`);
await deny(u.officerA,read(u.a,u.eventA));
await q(`UPDATE public.tenants SET status='suspended' WHERE id=${id(u.a)}`);
await deny(u.directorA,read(u.a,u.eventA));
console.log(`Exam roster F2 two-centre PGlite security rehearsal: ${checks} checks passed`);
