// Synthetic PostgreSQL security rehearsal. NEVER connects to UniPathway or Dishbee.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const ids={
 centreA:'10000000-0000-4000-8000-000000000001',
 centreB:'10000000-0000-4000-8000-000000000002',
 directorA:'20000000-0000-4000-8000-000000000001',
 directorB:'20000000-0000-4000-8000-000000000002',
 officeA:'20000000-0000-4000-8000-000000000003',
 secretaryA:'20000000-0000-4000-8000-000000000004',
 officeB:'20000000-0000-4000-8000-000000000005',
 studentTech:'20000000-0000-4000-8000-000000000006',
 studentNonTech:'20000000-0000-4000-8000-000000000007',
 studentB:'20000000-0000-4000-8000-000000000008',
 newStaff:'20000000-0000-4000-8000-000000000009',
 moduleTech:'30000000-0000-4000-8000-000000000001',
 moduleGeneral:'30000000-0000-4000-8000-000000000002',
 programmeTech:'40000000-0000-4000-8000-000000000001',
 programmeGeneral:'40000000-0000-4000-8000-000000000002',
};
let checks=0;
const query=s=>db.query(s);
const as=async(user,sql)=>{
 await db.exec('RESET ROLE');
 await query(`SELECT set_config('test.uid','${user}',false)`);
 await db.exec('SET ROLE authenticated');
 try{return await query(sql);}finally{await db.exec('RESET ROLE');}
};
const rejects=async(user,sql,pattern=/(denied|required|permission|role|access|centre|director|superadmin|match|policy|invitation|invalid|grant|update|reload)/i)=>{
 await assert.rejects(()=>as(user,sql),pattern);checks++;
};
const result=async(user,sql,expected)=>{
 const v=await as(user,sql);assert.deepEqual(v.rows,expected);checks++;
};
await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
 CREATE SCHEMA auth;CREATE SCHEMA unipathway_acl;
 CREATE TYPE public.app_role AS ENUM
  ('superadmin','centre_director','admissions_admin','lecturer','student','programme_leader');
 CREATE TABLE public.tenants(id uuid PRIMARY KEY,name text,slug text);
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text UNIQUE);
 CREATE TABLE public.profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),tenant_id uuid REFERENCES public.tenants(id),
  full_name text,email text);
 CREATE TABLE public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),tenant_id uuid REFERENCES public.tenants(id),role public.app_role,
  UNIQUE(user_id,role,tenant_id));
 CREATE TABLE public.audit_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,user_id uuid,action text,entity_type text,entity_id uuid,
  details jsonb,created_at timestamptz DEFAULT now());
 CREATE TABLE public.programmes(id uuid PRIMARY KEY,tenant_id uuid,status text);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid,title text);
 CREATE TABLE public.student_enrolments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,programme_id uuid,tenant_id uuid,status text);
 CREATE TABLE public.leave_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid, user_id uuid, start_date date, status text, reason text);
 CREATE TABLE public.scheduled_lectures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,module_id uuid,day_of_week integer,start_time time,end_time time,room text,is_active boolean);
 CREATE TABLE public.unipathway_staff_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,created_by uuid,assigned_to uuid,title text,detail text, due_on date,priority text,status text);
 CREATE TABLE public.lab_sessions(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,lecturer_id uuid);
 CREATE TABLE public.lab_vms(id uuid PRIMARY KEY,tenant_id uuid,student_id uuid,lab_session_id uuid);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.get_user_tenant_id(p_user uuid) RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $$ SELECT p.tenant_id FROM public.profiles p WHERE p.user_id=p_user $$;
 CREATE FUNCTION public.has_role(p_user uuid,p_role public.app_role) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user
 AND r.role=p_role AND (r.tenant_id IS NULL OR r.tenant_id=public.get_user_tenant_id(p_user))) $$;
 ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.lab_vms ENABLE ROW LEVEL SECURITY;
 CREATE POLICY existing_sessions ON public.lab_sessions FOR SELECT TO authenticated
 USING(tenant_id=public.get_user_tenant_id(auth.uid()));
 CREATE POLICY existing_vms ON public.lab_vms FOR SELECT TO authenticated
 USING(student_id=auth.uid() OR (tenant_id=public.get_user_tenant_id(auth.uid())
 AND public.has_role(auth.uid(),'centre_director')));
 GRANT USAGE ON SCHEMA auth,public TO authenticated;
 GRANT SELECT ON public.lab_sessions,public.lab_vms TO authenticated;
`);
await db.exec(readFileSync('scripts/activation/unipathway-office-roles-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-office-access-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-staff-invitations-forward.sql','utf8'));
await db.exec(readFileSync('scripts/activation/unipathway-tech-lab-entitlements-forward.sql','utf8'));
const t=ids;
await db.exec(`
 INSERT INTO public.tenants VALUES ('${t.centreA}','Jhelum','jhelum'),('${t.centreB}','Lahore','lahore');
 INSERT INTO auth.users VALUES
 ('${t.directorA}','director.a@unipathway.pk'),('${t.directorB}','director.b@unipathway.pk'),
 ('${t.officeA}','office.a@unipathway.pk'),('${t.secretaryA}','secretary.a@unipathway.pk'),
 ('${t.officeB}','office.b@unipathway.pk'),('${t.studentTech}','tech@unipathway.pk'),
 ('${t.studentNonTech}','maths@unipathway.pk'),('${t.studentB}','student.b@unipathway.pk'),
 ('${t.newStaff}','new.secretary@unipathway.pk');
 INSERT INTO public.profiles(user_id,tenant_id,full_name,email) VALUES
 ('${t.directorA}','${t.centreA}','Director A','director.a@unipathway.pk'),
 ('${t.directorB}','${t.centreB}','Director B','director.b@unipathway.pk'),
 ('${t.officeA}','${t.centreA}','Office A','office.a@unipathway.pk'),
 ('${t.secretaryA}','${t.centreA}','Secretary A','secretary.a@unipathway.pk'),
 ('${t.officeB}','${t.centreB}','Office B','office.b@unipathway.pk'),
 ('${t.studentTech}','${t.centreA}','Tech Student','tech@unipathway.pk'),
 ('${t.studentNonTech}','${t.centreA}','Maths Student','maths@unipathway.pk'),
 ('${t.studentB}','${t.centreB}','Other Student','student.b@unipathway.pk');
 INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES
 ('${t.directorA}','${t.centreA}','centre_director'),
 ('${t.directorB}','${t.centreB}','centre_director'),
 ('${t.officeA}','${t.centreA}','office_admin'),
 ('${t.secretaryA}','${t.centreA}','secretary'),
 ('${t.officeB}','${t.centreB}','office_admin'),
 ('${t.studentTech}','${t.centreA}','student'),
 ('${t.studentNonTech}','${t.centreA}','student'),
 ('${t.studentB}','${t.centreB}','student');
 INSERT INTO public.programmes VALUES('${t.programmeTech}','${t.centreA}','active'),
 ('${t.programmeGeneral}','${t.centreA}','active');
 INSERT INTO public.modules VALUES
 ('${t.moduleTech}','${t.centreA}','${t.programmeTech}',NULL,'Software engineering lab'),
 ('${t.moduleGeneral}','${t.centreA}','${t.programmeGeneral}',NULL,'English tuition');
 INSERT INTO public.student_enrolments(student_id,programme_id,tenant_id,status) VALUES
 ('${t.studentTech}','${t.programmeTech}','${t.centreA}','active'),
 ('${t.studentNonTech}','${t.programmeGeneral}','${t.centreA}','active');
 INSERT INTO public.unipathway_staff_tasks(tenant_id,created_by,assigned_to,title,detail,due_on,priority,status)
 VALUES('${t.centreA}','${t.directorA}','${t.officeA}','Prepare centre timetable','Private details',current_date,'normal','pending'),
 ('${t.centreB}','${t.directorB}','${t.officeB}','Other centre task','Keep private',current_date,'normal','pending');
 INSERT INTO public.scheduled_lectures(tenant_id,module_id,day_of_week,start_time,end_time,room,is_active)
 VALUES('${t.centreA}','${t.moduleTech}',1,'09:00','10:00','Room 1',true),
 ('${t.centreB}','${t.moduleGeneral}',2,'11:00','12:00','Room B',true);
 INSERT INTO public.leave_requests(tenant_id,user_id,start_date,status,reason)
 VALUES('${t.centreA}','${t.officeA}',current_date,'pending','Private personal reason'),
 ('${t.centreB}','${t.officeB}',current_date,'approved','Private other-centre reason');
 INSERT INTO public.lab_sessions VALUES
 ('50000000-0000-4000-8000-000000000001','${t.centreA}','${t.moduleTech}',NULL),
 ('50000000-0000-4000-8000-000000000002','${t.centreA}','${t.moduleGeneral}',NULL);
 INSERT INTO public.lab_vms VALUES
 ('60000000-0000-4000-8000-000000000001','${t.centreA}','${t.studentTech}','50000000-0000-4000-8000-000000000001'),
 ('60000000-0000-4000-8000-000000000002','${t.centreA}','${t.studentNonTech}','50000000-0000-4000-8000-000000000002');
`);
const getWorkspace=user=>as(user,"SELECT public.get_my_unipathway_office_workspace('office_admin') AS data");
const off=(await getWorkspace(t.officeA)).rows[0].data;
assert.deepEqual(off.capabilities.includes('invite_limited_staff'),true);checks++;
assert.equal(off.centreId,t.centreA);checks++;
assert.equal(off.tasks.length,1);checks++;
assert.equal(off.schedule.length,1);checks++;
assert.equal(JSON.stringify(off).includes('Private personal reason'),false);checks++;
assert.equal(JSON.stringify(off).includes('Other centre task'),false);checks++;
const sec=(await as(t.secretaryA,"SELECT public.get_my_unipathway_office_workspace('secretary') AS data")).rows[0].data;
assert.equal(sec.capabilities.includes('staff_directory'),false);checks++;
assert.equal(sec.staff.length,0);checks++;
await rejects(t.studentTech,"SELECT public.get_my_unipathway_office_workspace('office_admin')");
await rejects(t.officeB,`SELECT public.get_unipathway_staff_access('${t.officeA}','office_admin')`);
await rejects(t.officeA,`SELECT public.set_unipathway_staff_access('${t.officeA}','office_admin',0,'{}'::jsonb)`);
await rejects(t.directorB,`SELECT public.set_unipathway_staff_access('${t.secretaryA}','secretary',0,'{}'::jsonb)`);
let update=(await as(t.directorA,`SELECT public.set_unipathway_staff_access('${t.secretaryA}','secretary',0,'{"staff_directory":"allow","view_schedule":"deny"}'::jsonb) AS data`)).rows[0].data;
assert.equal(update.revision,1);checks++;
const secAfter=(await as(t.secretaryA,"SELECT public.get_my_unipathway_office_workspace('secretary') AS data")).rows[0].data;
assert.equal(secAfter.capabilities.includes('staff_directory'),true);checks++;
assert.equal(secAfter.capabilities.includes('view_schedule'),false);checks++;
assert.equal(secAfter.staff.length>0,true);checks++;
await rejects(t.directorA,`SELECT public.set_unipathway_staff_access('${t.secretaryA}','secretary',0,'{}'::jsonb)`);
await rejects(t.directorA,`SELECT public.set_unipathway_staff_access('${t.secretaryA}','secretary',1,'{"superadmin":"allow"}'::jsonb)`);
await rejects(t.directorA,`SELECT public.set_unipathway_staff_access('${t.studentTech}','secretary',0,'{}'::jsonb)`);
// Office administrators cannot assign privileged director/superadmin or custom overrides.
await rejects(t.officeA,`SELECT public.prepare_unipathway_account_invitation(
 'new.secretary@unipathway.pk','New Secretary','centre_director','${t.centreA}','{}'::jsonb)`);
await rejects(t.officeA,`SELECT public.prepare_unipathway_account_invitation(
 'new.secretary@unipathway.pk','New Secretary','secretary','${t.centreA}','{"view_leave_summary":"allow"}'::jsonb)`);
await rejects(t.officeA,`SELECT public.prepare_unipathway_account_invitation(
 'office.b@unipathway.pk','Wrong Centre','secretary','${t.centreA}','{}'::jsonb)`);
const inv=(await as(t.officeA,`SELECT public.prepare_unipathway_account_invitation(
 'new.secretary@unipathway.pk','New Secretary','secretary','${t.centreA}','{}'::jsonb) AS data`)).rows[0].data;
assert.equal(inv.status,'prepared');checks++;
await rejects(t.officeA,`SELECT public.complete_unipathway_account_invitation('${inv.id}','${t.newStaff}',false)`);
await db.exec('RESET ROLE');
await query("SELECT set_config('request.jwt.claim.role','service_role',false)");
await db.exec('SET ROLE service_role');
const completed=await query(`SELECT public.complete_unipathway_account_invitation('${inv.id}','${t.newStaff}',true) AS data`);
await db.exec('RESET ROLE');
assert.equal(completed.rows[0].data.status,'assigned');checks++;
const staff=(await as(t.newStaff,"SELECT public.get_my_unipathway_office_workspace('secretary') AS data")).rows[0].data;
assert.equal(staff.role,'secretary');checks++;
await rejects(t.newStaff,`SELECT public.get_my_unipathway_office_workspace('office_admin')`);
// Lab access requires two separate operator steps plus matching learner enrolment.
await result(t.studentTech,`SELECT public.check_my_unipathway_tech_lab('${t.moduleTech}') AS allowed`,[{allowed:false}]);
await as(t.directorA,`SELECT public.review_unipathway_tech_lab_module('${t.moduleTech}',true,'Technology syllabus approved for centre practical delivery')`);
await result(t.studentTech,`SELECT public.check_my_unipathway_tech_lab('${t.moduleTech}') AS allowed`,[{allowed:false}]);
await rejects(t.directorB,`SELECT public.grant_unipathway_tech_lab_to_student('${t.studentTech}','${t.moduleTech}',now()+INTERVAL '90 days')`);
await rejects(t.directorA,`SELECT public.grant_unipathway_tech_lab_to_student('${t.studentNonTech}','${t.moduleTech}',now()+INTERVAL '90 days')`);
await as(t.directorA,`SELECT public.grant_unipathway_tech_lab_to_student('${t.studentTech}','${t.moduleTech}',now()+INTERVAL '90 days')`);
await result(t.studentTech,`SELECT public.check_my_unipathway_tech_lab('${t.moduleTech}') AS allowed`,[{allowed:true}]);
await result(t.studentNonTech,`SELECT public.check_my_unipathway_tech_lab('${t.moduleGeneral}') AS allowed`,[{allowed:false}]);
await result(t.studentTech,`SELECT module_id FROM public.my_unipathway_tech_lab_modules()`,[{module_id:t.moduleTech}]);
await result(t.studentNonTech,`SELECT module_id FROM public.my_unipathway_tech_lab_modules()`,[]);
await result(t.studentTech,'SELECT id FROM public.lab_vms',[{id:'60000000-0000-4000-8000-000000000001'}]);
await result(t.studentNonTech,'SELECT id FROM public.lab_vms',[]);
await result(t.studentTech,'SELECT id FROM public.lab_sessions',[{id:'50000000-0000-4000-8000-000000000001'}]);
await as(t.directorA,`SELECT public.revoke_unipathway_tech_lab('${t.studentTech}','${t.moduleTech}')`);
await result(t.studentTech,`SELECT public.check_my_unipathway_tech_lab('${t.moduleTech}') AS allowed`,[{allowed:false}]);
await result(t.studentTech,'SELECT id FROM public.lab_vms',[]);
console.log('UniPathway office roles and course-specific lab security:',checks,'PGlite assertions passed');
