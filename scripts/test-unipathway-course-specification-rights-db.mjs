import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const T_A='10000000-0000-0000-0000-000000000001';
const T_B='10000000-0000-0000-0000-000000000002';
const D_A='20000000-0000-0000-0000-000000000001';
const D2_A='20000000-0000-0000-0000-000000000002';
const L_A='20000000-0000-0000-0000-000000000003';
const S_A='20000000-0000-0000-0000-000000000004';
const D_B='20000000-0000-0000-0000-000000000005';
const MOD_A='30000000-0000-0000-0000-000000000001';
const MOD_B='30000000-0000-0000-0000-000000000002';
const MATERIAL_A='40000000-0000-0000-0000-000000000001';
const MATERIAL_B='40000000-0000-0000-0000-000000000002';
let checks=0;
const sql=(s)=>db.query(s);
const as=async(uid,tenant,statement)=>{
 await db.exec('RESET ROLE');
 await sql(`SELECT set_config('test.uid','${uid}',false),set_config('test.tenant','${tenant}',false)`);
 await db.exec('SET ROLE authenticated');
 try{return await sql(statement);}finally{await db.exec('RESET ROLE');}
};
const rejects=async(uid,tenant,statement,pattern)=>{
 await assert.rejects(()=>as(uid,tenant,statement),pattern);
 checks++;
};
const equals=async(uid,tenant,statement,wanted)=>{
 const result=await as(uid,tenant,statement);
 assert.deepEqual(result.rows,wanted);checks++;
};
await db.exec(`
 CREATE ROLE authenticated; CREATE ROLE anon;
 CREATE SCHEMA auth; CREATE SCHEMA unipathway_acl; CREATE SCHEMA storage;
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated;
 CREATE TYPE public.app_role AS ENUM ('student','lecturer','centre_director','programme_leader','superadmin');
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,lecturer_id uuid);
 CREATE TABLE public.unipathway_module_materials(
   id uuid PRIMARY KEY,tenant_id uuid NOT NULL,module_id uuid REFERENCES public.modules(id),
   created_by uuid NOT NULL,title text NOT NULL,object_path text NOT NULL,
   publication_status text NOT NULL DEFAULT 'draft'
 );
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   bucket_id text NOT NULL,name text NOT NULL);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
 AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.get_user_tenant_id(_user_id uuid) RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.tenant_id FROM public.profiles p WHERE p.user_id=_user_id LIMIT 1 $$;
 CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id
  AND r.role=_role AND (r.tenant_id IS NULL
  OR r.tenant_id=public.get_user_tenant_id(_user_id))) $$;
 CREATE FUNCTION public.can_manage_unipathway_module(p_module uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.modules m
 WHERE m.id=p_module AND m.tenant_id=public.get_user_tenant_id(auth.uid()) AND
 (public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR (public.has_role(auth.uid(),'lecturer'::public.app_role) AND m.lecturer_id=auth.uid()))) $$;
 ALTER TABLE public.unipathway_module_materials ENABLE ROW LEVEL SECURITY;
 CREATE POLICY base_material_read ON public.unipathway_module_materials FOR SELECT
 TO authenticated USING(tenant_id=public.get_user_tenant_id(auth.uid()));
 CREATE POLICY base_material_update ON public.unipathway_module_materials FOR UPDATE
 TO authenticated USING(public.can_manage_unipathway_module(module_id))
 WITH CHECK(public.can_manage_unipathway_module(module_id));
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY base_module_storage_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='unipathway-module-materials');
 GRANT SELECT,UPDATE ON public.unipathway_module_materials TO authenticated;
 GRANT SELECT ON public.modules TO authenticated;
 GRANT SELECT ON storage.objects TO authenticated;
 INSERT INTO public.profiles VALUES
  ('${D_A}','${T_A}'),('${D2_A}','${T_A}'),('${L_A}','${T_A}'),
  ('${S_A}','${T_A}'),('${D_B}','${T_B}');
 INSERT INTO public.user_roles VALUES
  ('${D_A}','${T_A}','centre_director'),('${D2_A}','${T_A}','centre_director'),
  ('${L_A}','${T_A}','lecturer'),('${S_A}','${T_A}','student'),
  ('${D_B}','${T_B}','centre_director');
 INSERT INTO public.modules VALUES
  ('${MOD_A}','${T_A}','${L_A}'),('${MOD_B}','${T_B}',NULL);
 INSERT INTO public.unipathway_module_materials VALUES
  ('${MATERIAL_A}','${T_A}','${MOD_A}','${L_A}','Lecture notes','${T_A}/${MOD_A}/lesson.pdf','draft'),
  ('${MATERIAL_B}','${T_B}','${MOD_B}','${D_B}','Other centre','${T_B}/${MOD_B}/other.pdf','draft');
 INSERT INTO storage.objects(bucket_id,name) VALUES
  ('unipathway-module-materials','${T_A}/${MOD_A}/lesson.pdf'),
  ('unipathway-module-materials','${T_B}/${MOD_B}/other.pdf');
`);
const patch=readFileSync('scripts/activation/unipathway-course-specifications-and-rights-forward.sql','utf8');
assert(!patch.includes('DROP TABLE'), 'Forward patch unexpectedly destructive');
assert(patch.includes('AS RESTRICTIVE'),'Material RLS must narrow rather than widen');
await db.exec(patch);

const makeSpec=(tenant,module,board='cambridge')=>`
INSERT INTO public.unipathway_course_specifications
(tenant_id,board_key,qualification_title,qualification_code,subject,
 syllabus_code,specification_version,exam_session,specification_source_url,module_id,created_by)
VALUES ('${tenant}','${board}','IGCSE Mathematics teaching plan',
 '0580','Mathematics','0580','2026–2028','May/June 2027',
 'https://www.cambridgeinternational.org/qualification/0580','${module}',auth.uid())
RETURNING id,review_status,authorisation_status`;
await rejects(D_A,T_A,makeSpec(T_B,MOD_B),/permission|row-level|policy/i);
await rejects(L_A,T_A,makeSpec(T_A,MOD_A),/permission|row-level|policy/i);
const spec=(await as(D_A,T_A,makeSpec(T_A,MOD_A))).rows[0];
assert.equal(spec.review_status,'draft');assert.equal(spec.authorisation_status,'unverified');checks+=2;
await rejects(D_A,T_A,`SELECT public.review_unipathway_course_specification('${spec.id}','reviewed')`,/separate authorized|separate authorised|reviewer/i);
await rejects(D_B,T_B,`SELECT public.review_unipathway_course_specification('${spec.id}','reviewed')`,/management access/i);
await as(D2_A,T_A,`SELECT public.review_unipathway_course_specification('${spec.id}','reviewed')`);
await equals(D_A,T_A,`SELECT review_status,authorisation_status FROM public.unipathway_course_specifications WHERE id='${spec.id}'`,
 [{review_status:'reviewed',authorisation_status:'unverified'}]);
await equals(D_B,T_B,`SELECT id FROM public.unipathway_course_specifications WHERE id='${spec.id}'`,[]);
await equals(S_A,T_A,`SELECT id FROM public.unipathway_course_specifications WHERE id='${spec.id}'`,[]);
await rejects(D_A,T_A,`UPDATE public.unipathway_course_specifications SET authorisation_status='verified' WHERE id='${spec.id}'`,/permission/i);

await rejects(D_A,T_A,`UPDATE public.unipathway_module_materials SET publication_status='published' WHERE id='${MATERIAL_A}'`,/Approved current rights/i);
const insertRights=`
INSERT INTO public.unipathway_material_rights
(tenant_id,module_id,material_id,specification_id,rights_basis,rights_holder,
 evidence_reference,created_by)
VALUES('${T_A}','${MOD_A}','${MATERIAL_A}','${spec.id}',
 'original_work','UniPathway curriculum team','Authored by centre staff; register 2026-001',auth.uid())
RETURNING id,review_status`;
const rights=(await as(L_A,T_A,insertRights)).rows[0];
assert.equal(rights.review_status,'pending');checks++;
await rejects(L_A,T_A,`UPDATE public.unipathway_material_rights SET review_status='approved' WHERE id='${rights.id}'`,/permission/i);
await rejects(L_A,T_A,`SELECT public.review_unipathway_material_rights('${rights.id}','approved')`,/Independent centre/i);
await rejects(D_B,T_B,`SELECT public.review_unipathway_material_rights('${rights.id}','approved')`,/Independent centre/i);
await as(D2_A,T_A,`SELECT public.review_unipathway_material_rights('${rights.id}','approved')`);
await as(D_A,T_A,`UPDATE public.unipathway_module_materials SET publication_status='published' WHERE id='${MATERIAL_A}'`);
await equals(S_A,T_A,`SELECT title FROM public.unipathway_module_materials WHERE id='${MATERIAL_A}'`,[{title:'Lecture notes'}]);
await equals(S_A,T_A,`SELECT name FROM storage.objects WHERE name='${T_A}/${MOD_A}/lesson.pdf'`,[{name:`${T_A}/${MOD_A}/lesson.pdf`}]);
await equals(S_A,T_A,`SELECT name FROM storage.objects WHERE name='${T_B}/${MOD_B}/other.pdf'`,[]);
await as(D_A,T_A,`SELECT public.review_unipathway_material_rights('${rights.id}','withdrawn')`);
await equals(S_A,T_A,`SELECT title FROM public.unipathway_module_materials WHERE id='${MATERIAL_A}'`,[]);
await equals(S_A,T_A,`SELECT name FROM storage.objects WHERE name='${T_A}/${MOD_A}/lesson.pdf'`,[]);
await rejects(D_A,T_A,`UPDATE public.unipathway_module_materials SET title='changed' WHERE id='${MATERIAL_A}'`,/Approved current rights/i);
await equals(D_B,T_B,`SELECT id FROM public.unipathway_material_rights WHERE id='${rights.id}'`,[]);
await equals(S_A,T_A,`SELECT id FROM public.unipathway_material_rights WHERE id='${rights.id}'`,[]);
console.log('UniPathway course specification and rights DB boundaries:',checks,'assertions passed');
