// Isolated PGlite security exercise — no hosted database connection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
let checks=0;
const id={a:'10000000-0000-4000-8000-000000000001',
 b:'10000000-0000-4000-8000-000000000002',
 student:'20000000-0000-4000-8000-000000000001',
 studentB:'20000000-0000-4000-8000-000000000002',
 welfare:'20000000-0000-4000-8000-000000000003',
 welfareB:'20000000-0000-4000-8000-000000000004',
 lecturer:'20000000-0000-4000-8000-000000000005',
 director:'20000000-0000-4000-8000-000000000006',
 programme:'30000000-0000-4000-8000-000000000001',
 module:'40000000-0000-4000-8000-000000000001',
 session:'50000000-0000-4000-8000-000000000001',
 pending:'50000000-0000-4000-8000-000000000002',
 material:'60000000-0000-4000-8000-000000000001',
 artifact:'70000000-0000-4000-8000-000000000001',
 anonymous:'80000000-0000-4000-8000-000000000001',
 nonce:'90000000-0000-4000-8000-000000000001'};
const q=sql=>db.query(sql);
const as=async(user,sql)=>{
 await db.exec('RESET ROLE');
 await q(`SELECT set_config('test.uid','${user}',false)`);
 await db.exec('SET ROLE authenticated');
 try{return await q(sql);}finally{await db.exec('RESET ROLE');}
};
const deny=async(user,sql)=>{
 await assert.rejects(()=>as(user,sql),/(denied|role|required|permission|access|centre|available|review|revision|closed|case|invalid|completed class|contactable active student)/i);checks++;
};
const check=async(user,sql,expected)=>{
 const r=await as(user,sql);assert.deepEqual(r.rows,expected);checks++;
};
await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
 CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE TYPE public.app_role AS ENUM('student','lecturer','programme_leader','centre_director','welfare_officer');
 CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY REFERENCES auth.users(id),tenant_id uuid NOT NULL REFERENCES public.tenants(id));
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid);
 CREATE TABLE public.student_enrolments(student_id uuid,tenant_id uuid,programme_id uuid,status text);
 CREATE TABLE public.live_class_sessions(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,title text,
  starts_at timestamptz,ends_at timestamptz,status text);
 CREATE TABLE public.unipathway_module_materials(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,
  title text,object_path text,publication_status text,available_at timestamptz);
 CREATE TABLE public.live_class_artifacts(id uuid PRIMARY KEY,tenant_id uuid,session_id uuid,
  publication_status text,storage_reference text,available_at timestamptz);
 CREATE TABLE public.lesson_ai_packs(id uuid PRIMARY KEY,tenant_id uuid,session_id uuid,status text,summary text);
 CREATE TABLE public.classroom_recordings(id uuid PRIMARY KEY,tenant_id uuid,status text);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY,bucket_id text,name text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
 AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public,storage TO authenticated;
 ALTER TABLE public.unipathway_module_materials ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.live_class_artifacts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.lesson_ai_packs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.classroom_recordings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY baseline_material ON public.unipathway_module_materials FOR SELECT TO authenticated USING(true);
 CREATE POLICY baseline_artifacts ON public.live_class_artifacts FOR SELECT TO authenticated USING(true);
 CREATE POLICY baseline_packs ON public.lesson_ai_packs FOR SELECT TO authenticated USING(true);
 CREATE POLICY baseline_legacy ON public.classroom_recordings FOR SELECT TO authenticated USING(true);
 CREATE POLICY baseline_storage ON storage.objects FOR SELECT TO authenticated USING(true);
 GRANT SELECT ON public.unipathway_module_materials,public.live_class_artifacts,public.lesson_ai_packs,public.classroom_recordings,storage.objects TO authenticated;
`);
await db.exec(readFileSync('scripts/activation/unipathway-wellbeing-requests-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-post-class-resource-release-forward.sql','utf8'));
const t=id;
await db.exec(`
 INSERT INTO public.tenants VALUES('${t.a}'),('${t.b}');
 INSERT INTO auth.users VALUES ('${t.student}'),('${t.studentB}'),('${t.welfare}'),('${t.welfareB}'),('${t.lecturer}'),('${t.director}');
 INSERT INTO public.profiles VALUES
 ('${t.student}','${t.a}'),('${t.studentB}','${t.b}'),('${t.welfare}','${t.a}'),
 ('${t.welfareB}','${t.b}'),('${t.lecturer}','${t.a}'),('${t.director}','${t.a}');
 INSERT INTO public.user_roles VALUES
 ('${t.student}','${t.a}','student'),('${t.studentB}','${t.b}','student'),
 ('${t.welfare}','${t.a}','welfare_officer'),('${t.welfareB}','${t.b}','welfare_officer'),
 ('${t.lecturer}','${t.a}','lecturer'),('${t.director}','${t.a}','centre_director');
 INSERT INTO public.modules VALUES('${t.module}','${t.a}','${t.programme}','${t.lecturer}');
 INSERT INTO public.student_enrolments VALUES('${t.student}','${t.a}','${t.programme}','active');
 INSERT INTO public.live_class_sessions(id,tenant_id,module_id,title,starts_at,ends_at,status,actual_ended_at)
 VALUES ('${t.session}','${t.a}','${t.module}','Lab lecture',now()-interval '22 hours',now()-interval '20 hours','ended',now()-interval '20 hours'),
 ('${t.pending}','${t.a}','${t.module}','Future lecture',now()-interval '3 hours',now()-interval '1 hour','scheduled',null);
 INSERT INTO public.unipathway_module_materials VALUES
 ('${t.material}','${t.a}','${t.module}','Lab slides','${t.a}/slides.pdf','published',null,'${t.session}');
 INSERT INTO public.live_class_artifacts VALUES
 ('${t.artifact}','${t.a}','${t.session}','published','${t.a}/recording.mp4',null);
 INSERT INTO public.classroom_recordings VALUES
 ('75000000-0000-4000-8000-000000000001','${t.a}','available');
 INSERT INTO public.lesson_ai_packs VALUES
 ('73000000-0000-4000-8000-000000000001','${t.a}','${t.session}','published','Private recap');
 INSERT INTO storage.objects VALUES
 ('74000000-0000-4000-8000-000000000001','unipathway-module-materials','${t.a}/slides.pdf'),
 ('74000000-0000-4000-8000-000000000002','unipathway-class-media','${t.a}/recording.mp4');
`);
await check(t.student,`SELECT public.can_access_my_unipathway_class_resource('${t.session}','${t.a}') AS ok`,[{ok:false}]);
await check(t.student,'SELECT id FROM public.unipathway_module_materials',[]);
await check(t.student,'SELECT id FROM public.live_class_artifacts',[]);
await check(t.student,'SELECT id FROM public.lesson_ai_packs',[]);
await check(t.student,'SELECT id FROM public.classroom_recordings',[]);
await check(t.student,'SELECT name FROM storage.objects',[]);
await check(t.studentB,`SELECT public.can_access_my_unipathway_class_resource('${t.session}','${t.a}') AS ok`,[{ok:false}]);
await check(t.lecturer,`SELECT public.can_access_my_unipathway_class_resource('${t.session}','${t.a}') AS ok`,[{ok:true}]);
await deny(t.student,`SELECT public.approve_unipathway_urgent_class_release('${t.session}','Exceptionally urgent teaching need documented for this centre')`);
await deny(t.director,`SELECT public.approve_unipathway_urgent_class_release('${t.pending}','Exceptionally urgent teaching need documented for this centre')`);
const approval=await as(t.director,`SELECT public.approve_unipathway_urgent_class_release('${t.session}','Verified exceptional need for student practical revision access') AS data`);
assert.equal(approval.rows[0].data.hours,12);checks++;
await check(t.student,`SELECT public.can_access_my_unipathway_class_resource('${t.session}','${t.a}') AS ok`,[{ok:true}]);
await check(t.student,'SELECT id FROM public.unipathway_module_materials',[{id:t.material}]);
await check(t.student,'SELECT id FROM public.live_class_artifacts',[{id:t.artifact}]);
await check(t.student,`SELECT public.can_open_my_unipathway_class_media('${t.a}/recording.mp4') AS ok`,[{ok:true}]);
const request=await as(t.student,`SELECT public.submit_my_unipathway_welfare_request('mental_health','Please help me arrange private support for study stress.','soon') AS data`);
const caseId=request.rows[0].data.id;assert.equal(request.rows[0].data.status,'new');checks++;
await deny(t.student,'SELECT public.get_unipathway_welfare_queue()');
const queue=await as(t.welfare,'SELECT public.get_unipathway_welfare_queue() AS data');
assert.equal(queue.rows[0].data.length,1);checks++;
const other=await as(t.welfareB,'SELECT public.get_unipathway_welfare_queue() AS data');
assert.equal(other.rows[0].data.length,0);checks++;
const answer=await as(t.welfare,`SELECT public.respond_to_unipathway_welfare_request('${caseId}','Please visit our private counselling office to arrange an appointment.','${t.nonce}') AS data`);
assert.equal(answer.rows[0].data.status,'recorded');checks++;
const messages=await as(t.student,`SELECT public.my_unipathway_welfare_replies('${caseId}') AS data`);
assert.equal(messages.rows[0].data.length,1);checks++;
await deny(t.studentB,`SELECT public.my_unipathway_welfare_replies('${caseId}')`);
await deny(t.welfare,`SELECT public.review_unipathway_welfare_request('${caseId}','closed','Recorded final case outcome',1)`);
const closed=await as(t.welfare,`SELECT public.review_unipathway_welfare_request('${caseId}','closed','Care referral and follow-up confirmed',2) AS data`);
assert.equal(closed.rows[0].data.status,'closed');checks++;
await db.exec(`INSERT INTO public.unipathway_welfare_requests
 (id,tenant_id,student_id,anonymous,category,urgency,message)
 VALUES('${t.anonymous}','${t.a}',NULL,true,'academic','routine','Please review examination counselling options.')`);
const self=await as(t.student,'SELECT public.my_unipathway_welfare_requests() AS data');
assert.equal(self.rows[0].data.length,1);checks++;
await deny(t.welfare,`SELECT public.respond_to_unipathway_welfare_request('${t.anonymous}','Anonymous sender has no reply route and must not be identified.','${t.nonce}')`);
console.log('UniPathway wellbeing and release:',checks,'isolated PGlite assertions passed');
