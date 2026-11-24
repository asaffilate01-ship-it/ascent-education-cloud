// Offline synthetic database; never connects to the hosted project.
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {buildOnboardingActivation} from './activation/build-unipathway-onboarding-forward.mjs';
const db=new PGlite();
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),b=id(2),a=id(10),other=id(11),lecturer=id(12),director=id(13),admissions=id(14),foreignDirector=id(15),wrongRole=id(16),badOwner=id(17),owner=id(18),leader=id(19),peer=id(20);
const programme=id(30),otherProgramme=id(31),module=id(40),foreignModule=id(41),differentProgrammeModule=id(42),enrolment=id(50),withdrawn=id(51);
let checks=0;
try{
 await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;CREATE SCHEMA unipathway_acl;
 CREATE TYPE public.app_role AS ENUM('student','lecturer','centre_director','admissions_admin','programme_leader','superadmin');
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.tenants(id uuid PRIMARY KEY);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role public.app_role);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid);
 CREATE TABLE public.student_enrolments(id uuid PRIMARY KEY,tenant_id uuid,student_id uuid,programme_id uuid,status text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
 CREATE FUNCTION unipathway_acl.manager(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT public.has_role(auth.uid(),'superadmin') OR (t=public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'programme_leader')))$$;
 GRANT USAGE ON SCHEMA public,auth,unipathway_acl TO authenticated,anon;
 GRANT SELECT ON public.user_roles,public.student_enrolments TO authenticated;
 INSERT INTO public.tenants VALUES('${t}'),('${b}');
 `);
 for(const [u,tenant,role,roleTenant] of [[a,t,'student',t],[other,b,'student',b],[lecturer,t,'lecturer',t],[director,t,'centre_director',t],[admissions,t,'admissions_admin',t],[foreignDirector,b,'centre_director',b],[wrongRole,t,'centre_director',b],[badOwner,t,'superadmin',t],[owner,t,'superadmin',null],[leader,t,'programme_leader',t],[peer,t,'student',t]]){
  await db.query('INSERT INTO auth.users VALUES($1)',[u]);await db.query('INSERT INTO public.profiles VALUES($1,$2)',[u,tenant]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[u,roleTenant,role]);
 }
 await db.query("INSERT INTO public.modules VALUES($1,$2,$3),($4,$5,$3),($6,$2,$7)",[module,t,programme,foreignModule,b,differentProgrammeModule,otherProgramme]);
 await db.query("INSERT INTO public.student_enrolments VALUES($1,$2,$3,$4,'active'),($5,$2,$3,$4,'withdrawn')",[enrolment,t,a,programme,withdrawn]);
 const bundle=buildOnboardingActivation();await db.exec(bundle);checks++;
 await assert.rejects(()=>db.exec(bundle),/Partial or existing onboarding installation/);await db.exec('ROLLBACK');checks++;
 async function as(u,sql,args=[],role='authenticated'){await db.query("select set_config('test.uid',$1,false)",[u||'']);await db.exec('SET ROLE '+role);try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}}
 async function denied(fn){await assert.rejects(fn);checks++;}
 async function count(u,table,n){assert.equal((await as(u,'SELECT count(*)::int n FROM public.'+table)).rows[0].n,n);checks++;}
 const save=(u,tenant,kind,answers)=>as(u,"INSERT INTO public.onboarding_application_drafts(user_id,tenant_id,kind,answers) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(user_id,tenant_id,kind) DO UPDATE SET answers=excluded.answers",[u,tenant,kind,JSON.stringify(answers)]);
 const basic={'Full legal name':'Synthetic applicant',Email:'applicant@example.invalid'};
 const competency={subject:'Mathematics',framework:'Cambridge',level:'A Level',experience:'Reviewed qualification'};
 const teaching={...basic,'Competency 1 — Subject':competency.subject,'Competency 1 — Curriculum / awarding body':competency.framework,'Competency 1 — Maximum level / grade':competency.level,'Competency 1 — Relevant qualification or experience':competency.experience};
 await save(a,t,'student',basic);await save(other,b,'student',basic);await save(lecturer,t,'lecturer',teaching);checks+=3;
 await denied(()=>save(a,b,'student',basic));await denied(()=>save(a,t,'lecturer',basic));await denied(()=>save(wrongRole,t,'student',basic));
 await count(a,'onboarding_application_drafts',1);await count(peer,'onboarding_application_drafts',0);await count(director,'onboarding_application_drafts',2);await count(admissions,'onboarding_application_drafts',1);await count(foreignDirector,'onboarding_application_drafts',1);await count(wrongRole,'onboarding_application_drafts',0);await count(badOwner,'onboarding_application_drafts',0);await count(owner,'onboarding_application_drafts',2);
 await denied(()=>as(null,'SELECT * FROM public.onboarding_application_drafts',[],'anon'));
 const event=(u,target,kind,snapshot,action,note='')=>as(u,'SELECT public.record_onboarding_application_event($1,$2,$3::jsonb,$4,$5)',[target,kind,JSON.stringify(snapshot),action,note]);
 const status=async(u,target,kind)=>(await as(u,'SELECT public.get_onboarding_application_status($1,$2) value',[target,kind])).rows[0].value;
 await denied(()=>event(director,a,'student',basic,'screened','Review complete'));
 await event(a,a,'student',basic,'submitted');await event(a,a,'student',basic,'submitted');await count(a,'onboarding_application_events',1);
 await denied(()=>event(a,a,'student',basic,'screened','Self approval'));await denied(()=>event(foreignDirector,a,'student',basic,'screened','Foreign review'));
 await denied(()=>event(badOwner,a,'student',basic,'screened','Wrong owner'));
 await event(admissions,a,'student',basic,'screened','Review complete');assert.equal((await status(a,a,'student')).status,'screened');checks++;
 await save(a,t,'student',{...basic,Phone:'123'});assert.equal((await status(a,a,'student')).status,'draft');checks++;
 await denied(()=>status(peer,a,'student'));await denied(()=>status(badOwner,a,'student'));
 const review=(u,snapshot,decision='approved')=>as(u,'SELECT public.review_onboarding_teaching_competency($1,1,$2::jsonb,$3,$4)',[lecturer,JSON.stringify(snapshot),decision,'Independent evidence reference']);
 await denied(()=>review(lecturer,competency));await denied(()=>review(admissions,competency));await denied(()=>review(director,{...competency,level:'Wrong level'}));await denied(()=>review(badOwner,competency));await review(director,competency);await count(lecturer,'onboarding_teaching_reviews',1);await count(admissions,'onboarding_teaching_reviews',0);
 await db.query("DELETE FROM public.user_roles WHERE user_id=$1 AND role='lecturer'",[lecturer]);await denied(()=>review(director,competency));await count(lecturer,'onboarding_teaching_reviews',0);await count(lecturer,'onboarding_application_drafts',0);
 const register=(u,e,m,s='registered')=>as(u,'SELECT public.record_onboarding_module_registration($1,$2,$3)',[e,m,s]);
 await denied(()=>register(a,enrolment,module));await denied(()=>register(foreignDirector,enrolment,module));await denied(()=>register(wrongRole,enrolment,module));await denied(()=>register(badOwner,enrolment,module));await denied(()=>register(director,enrolment,foreignModule));await denied(()=>register(director,enrolment,differentProgrammeModule));await denied(()=>register(director,withdrawn,module));
 await register(leader,enrolment,module);await register(director,enrolment,module,'withdrawn');
 await count(a,'onboarding_module_registrations',1);await count(peer,'onboarding_module_registrations',0);await count(other,'onboarding_module_registrations',0);await count(badOwner,'onboarding_module_registrations',0);
 await denied(()=>as(a,"UPDATE public.onboarding_module_registrations SET status='registered'"));
 assert.equal((await as(a,'SELECT status FROM public.onboarding_module_registrations')).rows[0].status,'withdrawn');checks++;
 await denied(()=>as(a,'DELETE FROM public.onboarding_application_drafts'));
 await db.query("INSERT INTO public.user_roles VALUES($1,$2,'lecturer')",[a,t]);
 await denied(()=>as(a,"UPDATE public.onboarding_application_drafts SET kind='lecturer' WHERE kind='student'"));
 console.log('Onboarding forward activation: '+checks+' synthetic checks passed; no hosted connection.');
}finally{await db.close();}
