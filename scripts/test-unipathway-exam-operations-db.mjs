// Synthetic two-centre PostgreSQL rehearsal. NEVER uses a hosted Supabase project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),q=s=>db.query(s);
const u={
 a:'10000000-0000-4000-8000-000000000001',
 b:'10000000-0000-4000-8000-000000000002',
 officerA:'20000000-0000-4000-8000-000000000001',
 officerB:'20000000-0000-4000-8000-000000000002',
 directorA:'20000000-0000-4000-8000-000000000003',
 student:'20000000-0000-4000-8000-000000000004',
 eventA:'30000000-0000-4000-8000-000000000001',
 eventB:'30000000-0000-4000-8000-000000000002',
 noVenue:'30000000-0000-4000-8000-000000000003',
 request1:'40000000-0000-4000-8000-000000000001',
 request2:'40000000-0000-4000-8000-000000000002',
 request3:'40000000-0000-4000-8000-000000000003',
 request4:'40000000-0000-4000-8000-000000000004',
 request5:'40000000-0000-4000-8000-000000000005'
};
const id=x=>`'${x}'::uuid`,body=r=>typeof r.rows[0].value==='string'?JSON.parse(r.rows[0].value):r.rows[0].value;
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM('exams_officer','centre_director','student');
CREATE TABLE public.tenants(id uuid PRIMARY KEY,status text NOT NULL);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid NOT NULL);
CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
CREATE TABLE public.academic_events(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,event_type text NOT NULL,
 start_date timestamptz NOT NULL,end_date timestamptz,
 location text,all_day boolean NOT NULL DEFAULT false
);
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
INSERT INTO public.tenants VALUES ('${u.a}','active'),('${u.b}','active');
INSERT INTO public.profiles VALUES
 ('${u.officerA}','${u.a}'),('${u.officerB}','${u.b}'),
 ('${u.directorA}','${u.a}'),('${u.student}','${u.a}');
INSERT INTO public.user_roles VALUES
 ('${u.officerA}','${u.a}','exams_officer'),
 ('${u.officerB}','${u.b}','exams_officer'),
 ('${u.directorA}','${u.a}','centre_director'),
 ('${u.student}','${u.a}','student');
INSERT INTO public.academic_events VALUES
 ('${u.eventA}','${u.a}','exam','2026-12-01T09:00:00Z','2026-12-01T12:00:00Z','Room A',false),
 ('${u.eventB}','${u.b}','exam','2026-12-01T09:00:00Z','2026-12-01T12:00:00Z','Room B',false),
 ('${u.noVenue}','${u.a}','exam','2026-12-02T09:00:00Z','2026-12-02T12:00:00Z',null,false);
`);
await db.exec(readFileSync('scripts/activation/unipathway-exam-operations-forward.sql','utf8'));
let checks=0;
async function as(actor,sql,role='authenticated'){
 await db.exec('RESET ROLE');
 await q(`SELECT set_config('test.uid','${actor||''}',false)`);
 await db.exec(`SET ROLE ${role}`);
 try{return await q(sql)}finally{await db.exec('RESET ROLE')}
}
async function deny(actor,sql,role='authenticated'){
 await assert.rejects(()=>as(actor,sql,role),/permission|denied|required|invalid|not available|stale|reviewer|changed|identifier|approval|verified|submission|separation/i);
 checks++;
}
const read=(centre,limit=100)=>`SELECT public.get_unipathway_exam_session_plans(${id(centre)},0,${limit}) AS value`;
const save=(centre,event,expected,request,submit=false,ready=false,capacity=24,candidates=18,staff=2)=>
 `SELECT public.unipathway_save_exam_session_plan(
 ${id(centre)},${id(event)},${capacity},${candidates},${staff},
 ${ready},${ready},${ready},${ready},${submit},
 ${expected},${id(request)}) AS value`;
const approve=(centre,event,expected,request)=>
 `SELECT public.unipathway_approve_exam_session_plan(${id(centre)},${id(event)},${expected},${id(request)}) AS value`;
await deny(u.officerA,read(u.a));
await deny(u.officerA,save(u.a,u.eventA,0,u.request1));
const initially=(await q('SELECT * FROM unipathway_examops.activation_gate')).rows[0];
assert.equal(initially.reads_enabled,false);assert.equal(initially.writes_enabled,false);checks++;
await q('UPDATE unipathway_examops.activation_gate SET reads_enabled=true');
assert.deepEqual(body(await as(u.officerA,read(u.a))),[]);checks++;
await deny(u.officerA,save(u.a,u.eventA,0,u.request1));
await deny(u.student,read(u.a));
await deny(u.officerB,read(u.a));
await deny(u.officerA,read(u.b));
await deny(u.officerA,read(u.a,101));
await deny(u.officerA,'SELECT * FROM unipathway_examops.session_plans');
await deny(u.officerA,'SELECT * FROM unipathway_examops.command_receipts');
await deny(u.officerA,'SELECT * FROM unipathway_examops.activation_gate');
await deny(u.student,read(u.a),'anon');
await q('UPDATE unipathway_examops.activation_gate SET writes_enabled=true');
await deny(u.student,save(u.a,u.eventA,0,u.request1));
await deny(u.directorA,save(u.a,u.eventA,0,u.request1));
await deny(u.officerB,save(u.a,u.eventA,0,u.request1));
await deny(u.officerA,save(u.b,u.eventB,0,u.request1));
await deny(u.officerA,save(u.a,u.noVenue,0,u.request1));
await deny(u.officerA,save(u.a,u.eventA,0,u.request1,true,false));
const draft=body(await as(u.officerA,save(u.a,u.eventA,0,u.request1)));
assert.deepEqual({status:draft.status,revision:draft.revision,tenant:draft.tenant_id},{status:'draft',revision:1,tenant:u.a});checks++;
const replay=body(await as(u.officerA,save(u.a,u.eventA,0,u.request1)));
assert.deepEqual(replay,draft);checks++;
await deny(u.officerA,save(u.a,u.eventA,0,u.request1,false,false,25));
await deny(u.officerA,save(u.a,u.eventA,0,u.request2));
await deny(u.officerA,save(u.a,u.eventA,2,u.request2));
await deny(u.officerA,save(u.a,u.eventA,1,u.request2,true,false));
const submitted=body(await as(u.officerA,save(u.a,u.eventA,1,u.request2,true,true)));
assert.equal(submitted.status,'submitted');assert.equal(submitted.revision,2);checks++;
const second=body(await as(u.officerA,save(u.a,u.eventA,1,u.request2,true,true)));
assert.deepEqual(second,submitted);checks++;
await deny(u.officerA,approve(u.a,u.eventA,2,u.request3));
await deny(u.officerB,approve(u.a,u.eventA,2,u.request3));
await deny(u.student,approve(u.a,u.eventA,2,u.request3));
await deny(u.directorA,approve(u.b,u.eventA,2,u.request3));
await deny(u.directorA,approve(u.a,u.eventA,1,u.request3));
// Calendar changes invalidate approval until the Exams Officer resubmits the current revision.
await q(`UPDATE public.academic_events SET location='Room A Changed' WHERE id=${id(u.eventA)}`);
await deny(u.directorA,approve(u.a,u.eventA,2,u.request3));
await q(`UPDATE public.academic_events SET location='Room A' WHERE id=${id(u.eventA)}`);
const approved=body(await as(u.directorA,approve(u.a,u.eventA,2,u.request3)));
assert.equal(approved.status,'internally_approved');assert.equal(approved.revision,3);checks++;
assert.deepEqual(body(await as(u.directorA,approve(u.a,u.eventA,2,u.request3))),approved);checks++;
await deny(u.directorA,approve(u.a,u.eventA,2,u.request4));
await deny(u.officerA,save(u.a,u.eventA,2,u.request5));
const projected=body(await as(u.officerA,read(u.a)));
assert.equal(projected.length,1);
assert.equal(projected[0].event_id,u.eventA);
for(const secret of ['updated_by','submitted_by','approved_by','candidate_name','seat_assignment','identity_number','incident_narrative'])assert.equal(Object.hasOwn(projected[0],secret),false);
assert.equal(projected[0].status,'internally_approved');checks++;
// Role revocation and centre suspension must be immediate on every new RPC.
await q(`DELETE FROM public.user_roles WHERE user_id=${id(u.officerA)}`);
await deny(u.officerA,read(u.a));
await q(`UPDATE public.tenants SET status='suspended' WHERE id=${id(u.a)}`);
await deny(u.directorA,read(u.a));
console.log(`Exam operations PGlite acceptance: ${checks} assertions passed (gates, roles, centre, projections, revisions and approvals)`);
