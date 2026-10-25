import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA unipathway_acl;
 CREATE TABLE tenants(id uuid primary key);CREATE TABLE modules(id uuid primary key,tenant_id uuid,lecturer_id uuid);
 CREATE TABLE enrolled(student uuid,module uuid,active boolean default true);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION public.has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT r='student' AND u IN ('${id(3)}','${id(4)}')$$;
 CREATE FUNCTION unipathway_acl.module_access(m uuid,t uuid,w boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.modules x WHERE x.id=m AND x.tenant_id=t AND (x.lecturer_id=auth.uid() OR (NOT w AND EXISTS(SELECT 1 FROM public.enrolled e WHERE e.student=auth.uid() AND e.module=m AND e.active))))$$;
 GRANT USAGE ON SCHEMA public,auth,unipathway_acl TO authenticated;
 INSERT INTO tenants VALUES('${id(1)}'),('${id(2)}');
 INSERT INTO modules VALUES('${id(10)}','${id(1)}','${id(5)}'),('${id(11)}','${id(2)}','${id(6)}');
 INSERT INTO enrolled VALUES('${id(3)}','${id(10)}',true),('${id(4)}','${id(11)}',true);`);
 await db.exec(readFileSync('supabase/migrations/20261025234519_structured_lessons.sql','utf8'));
 async function actor(n,sql,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args)}finally{await db.exec('RESET ROLE')}}
 const draft=await actor(5,"insert into unipathway_lessons(tenant_id,module_id,title,body) values($1,$2,'First lesson','Understand the learning objectives and try the activity.') returning *",[id(1),id(10)]);const lesson=draft.rows[0].id;checks++;
 assert.equal((await actor(3,'select * from unipathway_lessons')).rows.length,0);checks++;
 await assert.rejects(()=>actor(3,"insert into unipathway_lessons(tenant_id,module_id,title) values($1,$2,'Forged')",[id(1),id(10)]));checks++;
 await assert.rejects(()=>actor(6,"update unipathway_lessons set title='Forged' where id=$1 returning id",[lesson]).then(r=>{if(!r.rows.length)throw Error('denied')}));checks++;
 await actor(5,"update unipathway_lessons set status='published' where id=$1",[lesson]);checks++;
 assert.equal((await actor(3,'select * from unipathway_lessons')).rows.length,1);checks++;
 assert.equal((await actor(4,'select * from unipathway_lessons')).rows.length,0);checks++;
 await assert.rejects(()=>actor(5,'update unipathway_lessons set module_id=$1,tenant_id=$2 where id=$3',[id(11),id(2),lesson]));checks++;
 await assert.rejects(()=>actor(5,"update unipathway_lessons set video_url='https://example.com/video.mp4' where id=$1",[lesson]));checks++;
 await assert.rejects(()=>actor(5,"update unipathway_lessons set resource_url='javascript:alert(1)' where id=$1",[lesson]));checks++;
 await actor(3,'insert into unipathway_lesson_progress(lesson_id,revision,position_seconds,completed) values($1,2,45,true)',[lesson]);checks++;
 await assert.rejects(()=>actor(4,'insert into unipathway_lesson_progress(lesson_id,revision) values($1,2)',[lesson]));checks++;
 await assert.rejects(()=>actor(3,'insert into unipathway_lesson_progress(student_id,lesson_id,revision) values($1,$2,2)',[id(4),lesson]));checks++;
 assert.equal((await actor(3,'select * from unipathway_lesson_revisions')).rows.length,0);checks++;
 assert.equal((await actor(5,'select * from unipathway_lesson_revisions')).rows.length,2);checks++;
 await assert.rejects(()=>actor(5,'delete from unipathway_lesson_revisions'));checks++;
 await actor(5,"update unipathway_lessons set body='New revised instructions for the learning activity.' where id=$1",[lesson]);checks++;
 await assert.rejects(()=>actor(3,'update unipathway_lesson_progress set position_seconds=55 where lesson_id=$1',[lesson]));checks++;
 await actor(3,'insert into unipathway_lesson_progress(lesson_id,revision) values($1,3)',[lesson]);checks++;
 await db.exec(`update enrolled set active=false where student='${id(3)}'`);
 assert.equal((await actor(3,'select * from unipathway_lessons')).rows.length,0);checks++;
 assert.equal((await actor(3,'select * from unipathway_lesson_progress')).rows.length,0);checks++;
 await assert.rejects(()=>actor(3,'insert into unipathway_lesson_progress(lesson_id,revision) values($1,3)',[lesson]));checks++;
 await assert.rejects(()=>actor(5,'truncate unipathway_lessons cascade'));checks++;
 await db.exec('SET ROLE anon');await assert.rejects(()=>db.exec('select * from unipathway_lessons'));checks++;
 console.log(`Structured lesson database: ${checks} publishing, access, revision, progress and withdrawal checks passed`);
}finally{await db.close()}
