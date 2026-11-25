// Disposable synthetic rehearsal using the actual onboarding activation and allocation SQL.
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildOnboardingActivation} from './activation/build-unipathway-onboarding-forward.mjs';
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),b=id(2),teacher=id(10),peer=id(11),director=id(12),foreignDirector=id(13),leader=id(14),student=id(15),wrong=id(16),owner=id(17);
const programme=id(20),foreignProgramme=id(21),module=id(30),foreignModule=id(31),schedule=id(40);
let checks=0;
try{
 await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;CREATE SCHEMA unipathway_acl;
 CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','admissions_admin','programme_leader','superadmin');
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid,full_name text);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
 CREATE TABLE public.programmes(id uuid PRIMARY KEY,tenant_id uuid,title text,level text,awarding_body text);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,title text,code text,lecturer_id uuid,updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE public.student_enrolments(id uuid PRIMARY KEY,tenant_id uuid,student_id uuid,programme_id uuid,status text);
 CREATE TABLE public.scheduled_lectures(id uuid PRIMARY KEY,tenant_id uuid,module_id uuid,lecturer_id uuid,is_active boolean,effective_until date);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
 CREATE FUNCTION unipathway_acl.manager(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT public.has_role(auth.uid(),'superadmin') OR (t=public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'programme_leader')))$$;
 GRANT USAGE ON SCHEMA public,auth,unipathway_acl TO authenticated,anon;
 GRANT SELECT ON public.user_roles,public.student_enrolments TO authenticated;
 -- Deliberately permissive legacy module grants to prove the new trigger is a real boundary.
 GRANT SELECT,INSERT,UPDATE ON public.modules TO authenticated;
 INSERT INTO public.tenants VALUES('${t}'),('${b}');
 `);
 for(const [u,c,role,rt] of [[teacher,t,'lecturer',t],[peer,t,'lecturer',t],[director,t,'centre_director',t],[foreignDirector,b,'centre_director',b],[leader,t,'programme_leader',t],[student,t,'student',t],[wrong,t,'centre_director',b],[owner,t,'superadmin',null]]){
  await db.query('INSERT INTO auth.users VALUES($1)',[u]);await db.query('INSERT INTO public.profiles VALUES($1,$2,$3)',[u,c,'Example '+role]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[u,rt,role]);
 }
 await db.query("INSERT INTO public.programmes VALUES($1,$2,'A Level','3','Cambridge'),($3,$4,'Other','3','Cambridge')",[programme,t,foreignProgramme,b]);
 await db.query("INSERT INTO public.modules(id,tenant_id,programme_id,title,code) VALUES($1,$2,$3,'Mathematics','M1'),($4,$5,$6,'Other','M2')",[module,t,programme,foreignModule,b,foreignProgramme]);
 await db.exec(buildOnboardingActivation());
 await db.exec(readFileSync('scripts/activation/unipathway-module-allocation-forward.sql','utf8'));
 async function actor(u,sql,args=[],role='authenticated'){await db.query("SELECT set_config('test.uid',$1,false)",[u||'']);await db.exec('SET ROLE '+role);try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}}
 const val=async(u,sql,args=[],role='authenticated')=>(await actor(u,sql,args,role)).rows[0].value;
 async function deny(fn){await assert.rejects(fn);checks++;}
 const read=(u,m=module,target=null)=>val(u,'SELECT public.get_unipathway_reviewed_allocation($1,$2) value',[m,target]);
 const record=(u,req,context,target=null,review=null,note='Module subject and awarding framework reviewed')=>val(u,'SELECT public.record_unipathway_reviewed_allocation($1,$2,$3,$4,$5,$6::jsonb,$7) value',[req,context.module_id,target,review,context.updated_at,JSON.stringify(context.module_scope),note]);
 const declaration={subject:'Mathematics',framework:'Cambridge',level:'A Level',experience:'Example reviewed evidence'};
 const answers={'Full legal name':'Synthetic lecturer',Email:'teacher@example.invalid','Competency 1 — Subject':declaration.subject,'Competency 1 — Curriculum / awarding body':declaration.framework,'Competency 1 — Maximum level / grade':declaration.level,'Competency 1 — Relevant qualification or experience':declaration.experience};
 const save=(u,a)=>actor(u,"INSERT INTO public.onboarding_application_drafts(user_id,tenant_id,kind,answers) VALUES($1,$2,'lecturer',$3::jsonb) ON CONFLICT(user_id,tenant_id,kind) DO UPDATE SET answers=excluded.answers",[u,t,JSON.stringify(a)]);
 const approve=(u,target,d=declaration,decision='approved')=>actor(u,'SELECT public.review_onboarding_teaching_competency($1,1,$2::jsonb,$3,$4)',[target,JSON.stringify(d),decision,'Reviewed qualification evidence']);
 await save(teacher,answers);await save(peer,answers);await approve(director,teacher);
 await deny(()=>read(director));await db.exec('UPDATE unipathway_module_allocation.activation_gate SET reads_enabled=true');
 const initial=await read(director,module,teacher);assert.equal(initial.people.length,2);assert.equal(initial.reviews.length,1);assert.equal(initial.decision_current,false);checks+=3;
 assert.equal((await read(director,module,peer)).reviews.length,0);checks++;
 const rid=initial.reviews[0].id;
 await deny(()=>record(director,id(50),initial,teacher,rid));await deny(()=>read(leader));await deny(()=>read(wrong));await deny(()=>read(director,foreignModule));await deny(()=>read(student));await deny(()=>val(null,'SELECT public.get_unipathway_reviewed_allocation($1,$2) value',[module,teacher],'anon'));
 // Gate off retains legacy assignments; no claim of live enforcement before activation.
 await actor(director,'UPDATE public.modules SET lecturer_id=$1 WHERE id=$2',[teacher,module]);await actor(director,'UPDATE public.modules SET lecturer_id=NULL WHERE id=$1',[module]);
 await db.exec('UPDATE unipathway_module_allocation.activation_gate SET writes_enabled=true');
 await deny(()=>actor(leader,'UPDATE public.modules SET lecturer_id=$1 WHERE id=$2',[teacher,module]));
 await deny(()=>actor(director,"INSERT INTO public.modules(id,tenant_id,programme_id,title,lecturer_id) VALUES($1,$2,$3,'New module',$4)",[id(32),t,programme,teacher]));
 const ctx=await read(director,module,teacher);
 await deny(()=>record(director,id(50),ctx,peer,rid));await deny(()=>record(leader,id(50),ctx,teacher,rid));await deny(()=>record(director,id(50),{...ctx,module_scope:{...ctx.module_scope,level:'different'}},teacher,rid));
 await deny(()=>record(director,id(50),{...ctx,updated_at:'2020-01-01T00:00:00Z'},teacher,rid));
 const receipt=await record(director,id(50),ctx,teacher,rid);assert.equal(receipt.lecturer_id,teacher);checks++;
 assert.deepEqual(await record(director,id(50),ctx,teacher,rid),receipt);checks++;
 assert.equal((await read(director,module,teacher)).decision_current,true);checks++;
 await deny(()=>actor(director,"UPDATE public.modules SET title='Changed' WHERE id=$1",[module]));
 await deny(()=>actor(director,'UPDATE public.modules SET lecturer_id=NULL WHERE id=$1',[module]));
 await deny(()=>actor(director,'SELECT * FROM unipathway_module_allocation.decisions'));
 await save(teacher,{...answers,'Competency 1 — Maximum level / grade':'Different declaration'});
 const stale=await read(director,module,teacher);assert.equal(stale.reviews.length,0);assert.equal(stale.decision_current,false);checks+=2;await deny(()=>record(director,id(51),stale,teacher,rid));
 await save(teacher,answers);await approve(director,teacher,declaration,'revoked');assert.equal((await read(director,module,teacher)).reviews.length,0);checks++;
 await approve(director,peer);const pc=await read(director,module,peer),pr=pc.reviews[0].id;
 await db.query('INSERT INTO public.scheduled_lectures VALUES($1,$2,$3,$4,true,NULL)',[schedule,t,module,teacher]);
 await deny(()=>record(director,id(52),pc,peer,pr));await deny(()=>record(director,id(53),pc));
 await db.query('UPDATE public.scheduled_lectures SET is_active=false WHERE id=$1',[schedule]);
 const reassigned=await record(director,id(52),pc,peer,pr);assert.equal(reassigned.previous_lecturer,teacher);assert.equal(reassigned.lecturer_id,peer);checks+=2;
 const active=await read(owner,module,peer);assert.equal(active.decision_current,true);checks++;
 await record(owner,id(53),active);assert.equal((await read(owner)).current_lecturer,null);checks++;
 await actor(director,"UPDATE public.modules SET title='Renamed' WHERE id=$1",[module]);
 console.log('Reviewed module allocation: '+checks+' synthetic checks passed');
}finally{await db.close();}
