// Isolated database rehearsal; no hosted database or actual student data.
import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const t=id(1),b=id(2),learner=id(10),peer=id(11),teacher=id(12),otherTeacher=id(13),director=id(14),otherDirector=id(15),foreign=id(16),wrongRole=id(17),inactive=id(18);
const prog=id(20),otherProg=id(21),mod=id(22),otherMod=id(23),foreignMod=id(24),cardId=id(50);
let checks=0;
try{
 await db.exec(`
 CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.tenants(id uuid PRIMARY KEY,name text);
 CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,tenant_id uuid,full_name text);
 CREATE TABLE public.user_roles(user_id uuid,tenant_id uuid,role text);
 CREATE TABLE public.student_enrolments(student_id uuid,tenant_id uuid,programme_id uuid,status text);
 CREATE TABLE public.modules(id uuid PRIMARY KEY,tenant_id uuid,programme_id uuid,lecturer_id uuid);
 CREATE TABLE public.kyc_documents(id uuid PRIMARY KEY,user_id uuid,tenant_id uuid,document_type text,status text,created_at timestamptz,verified_by uuid,verified_at timestamptz,expiry_date date);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_tenant_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT tenant_id FROM public.profiles WHERE user_id=u$$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 INSERT INTO public.tenants VALUES('${t}','Centre A'),('${b}','Centre B');
 `);
 for(const [u,c,role,rt] of [[learner,t,'student',t],[peer,t,'student',t],[teacher,t,'lecturer',t],[otherTeacher,t,'lecturer',t],[director,t,'centre_director',t],[otherDirector,b,'centre_director',b],[foreign,b,'student',b],[wrongRole,t,'centre_director',b],[inactive,t,'student',t]]){
  await db.query('INSERT INTO auth.users VALUES($1)',[u]);await db.query('INSERT INTO public.profiles VALUES($1,$2,$3)',[u,c,'Example '+role]);await db.query('INSERT INTO public.user_roles VALUES($1,$2,$3)',[u,rt,role]);
 }
 await db.query("INSERT INTO public.student_enrolments VALUES($1,$2,$3,'active'),($4,$2,$5,'active'),($6,$7,$3,'active'),($8,$2,$3,'withdrawn')",[learner,t,prog,peer,otherProg,foreign,b,inactive]);
 await db.query('INSERT INTO public.modules VALUES($1,$2,$3,$4),($5,$2,$6,$7),($8,$9,$3,$7)',[mod,t,prog,teacher,otherMod,otherProg,otherTeacher,foreignMod,b]);
 const evidence=(n,u,centre,status='verified',by=director,created='2026-01-01T00:00:00Z')=>db.query("INSERT INTO public.kyc_documents VALUES($1,$2,$3,'passport',$4,$5,$6,$5,NULL)",[id(n),u,centre,status,by,created]);
 await evidence(30,learner,t);await evidence(31,peer,t);await evidence(32,teacher,t);await evidence(33,foreign,b,'verified',otherDirector);await evidence(34,inactive,t);await evidence(35,otherTeacher,t,'pending');
 await db.exec(readFileSync('scripts/activation/unipathway-centre-id-cards-forward.sql','utf8'));
 const today=(await db.query("SELECT (now() AT TIME ZONE 'Asia/Karachi')::date::text d")).rows[0].d;
 const expiry=(await db.query("SELECT ((now() AT TIME ZONE 'Asia/Karachi')::date+30)::text d")).rows[0].d;
 async function actor(u,sql,args=[],role='authenticated'){await db.query("select set_config('test.uid',$1,false)",[u||'']);await db.exec('SET ROLE '+role);try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE');}}
 const val=async(u,sql,args=[],role='authenticated')=>(await actor(u,sql,args,role)).rows[0].value;
 async function deny(fn){await assert.rejects(fn);checks++;}
 const get=(u,k='student')=>val(u,'SELECT public.get_my_unipathway_centre_card($1) value',[k]);
 const roster=(u,k='student')=>val(u,'SELECT public.get_unipathway_centre_cards($1) value',[k]);
 const issue=(u,req=cardId,target=learner,k='student',until=expiry,note='Reviewed appointment or enrolment')=>val(u,'SELECT public.issue_unipathway_centre_card($1,$2,$3,$4,$5) value',[req,target,k,until,note]);
 const revoke=(u,req=cardId,note='Reported lost card')=>val(u,'SELECT public.revoke_unipathway_centre_card($1,$2) value',[req,note]);
 const lookup=(u,m,ref)=>val(u,'SELECT public.lookup_unipathway_student_card($1,$2) value',[m,ref]);
 await deny(()=>get(learner));await db.exec('UPDATE unipathway_centre_cards.activation_gate SET reads_enabled=true');
 assert.equal((await get(learner)).card,null);checks++;await deny(()=>issue(director));
 assert.equal((await roster(director)).people.length,2);checks++;
 await deny(()=>roster(learner));await deny(()=>roster(wrongRole));await deny(()=>actor(learner,'SELECT * FROM unipathway_centre_cards.cards'));
 await db.exec('UPDATE unipathway_centre_cards.activation_gate SET writes_enabled=true');
 await deny(()=>issue(learner));await deny(()=>issue(director,id(51),foreign));await deny(()=>issue(director,id(51),inactive));await deny(()=>issue(director,id(51),otherTeacher,'lecturer'));await deny(()=>issue(director,id(51),learner,'student','2099-01-01'));await deny(()=>issue(director,id(51),learner,'lecturer'));
 const issued=await issue(director);assert.equal(issued.status,'active');assert.equal(issued.issued_on,today);checks+=2;
 assert.deepEqual(await issue(director),issued);checks++;await deny(()=>issue(director,cardId,learner,'student',expiry,'Different request'));await deny(()=>issue(director,id(51)));
 assert.equal((await get(learner)).card.reference,issued.reference);assert.equal((await get(peer)).card,null);checks+=2;
 await deny(()=>get(teacher,'student'));await deny(()=>val(null,'SELECT public.get_my_unipathway_centre_card($1) value',['student'],'anon'));
 assert.equal((await lookup(teacher,mod,issued.reference)).match.student_id,learner);assert.equal((await lookup(otherTeacher,otherMod,issued.reference)).match,null);checks+=2;
 await deny(()=>lookup(teacher,otherMod,issued.reference));await deny(()=>lookup(learner,mod,issued.reference));
 await db.query("UPDATE public.student_enrolments SET status='withdrawn' WHERE student_id=$1",[learner]);
 assert.equal((await lookup(teacher,mod,issued.reference)).match,null);assert.equal((await get(learner)).card.status,'eligibility_review');checks+=2;
 await db.query("UPDATE public.student_enrolments SET status='active' WHERE student_id=$1",[learner]);
 await evidence(36,learner,t,'pending',director,'2026-02-01T00:00:00Z');
 assert.equal((await get(learner)).card.status,'eligibility_review');assert.equal((await lookup(teacher,mod,issued.reference)).match,null);checks+=2;
 await deny(()=>revoke(otherDirector));await deny(()=>revoke(learner));
 const revoked=await revoke(director);assert.equal(revoked.status,'revoked');assert.deepEqual(await revoke(director),revoked);checks+=2;
 await deny(()=>revoke(director,cardId,'Different reason'));await deny(()=>issue(director,id(51)));
 await db.query("UPDATE public.kyc_documents SET status='verified' WHERE id=$1",[id(36)]);
 const replacement=await issue(director,id(51));assert.notEqual(replacement.reference,issued.reference);assert.equal((await lookup(teacher,mod,issued.reference)).match,null);checks+=2;
 const staff=await issue(director,id(52),teacher,'lecturer');assert.equal((await get(teacher,'lecturer')).card.id,staff.id);assert.equal((await lookup(teacher,mod,staff.reference)).match,null);checks+=2;
 await db.query("DELETE FROM public.user_roles WHERE user_id=$1 AND role='student'",[learner]);
 assert.equal((await lookup(teacher,mod,replacement.reference)).match,null);checks++;await deny(()=>get(learner));
 console.log('Centre ID cards: '+checks+' isolated issue, revoke, role and register lookup checks passed');
}finally{await db.close();}
