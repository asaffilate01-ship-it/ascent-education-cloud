import assert from 'node:assert/strict';
export async function verifyMaterials(db){
 const id=n=>`92000000-0000-4000-8000-${String(n).padStart(12,'0')}`;let checks=0;
 await db.exec('BEGIN');
 for(const [u,r] of [[1,'lecturer'],[2,'student'],[3,'student']]){await db.query('insert into auth.users(id,email) values($1,$2)',[id(u),`m${u}@example.invalid`]);await db.query('insert into user_roles values($1,$2,$3)',[id(u),id(10),r]);}
 await db.query("insert into modules(id,tenant_id,programme_id,lecturer_id,title) values($1,$2,$3,$4,'Materials module')",[id(20),id(10),id(30),id(1)]);
 await db.query('insert into student_enrolments(student_id,tenant_id,programme_id) values($1,$2,$3)',[id(2),id(10),id(30)]);
 const login=async n=>{await db.exec('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(n)]);await db.exec('SET LOCAL ROLE authenticated');};
 const denied=async f=>{await db.exec('SAVEPOINT denied');await assert.rejects(f);await db.exec('ROLLBACK TO SAVEPOINT denied');checks++;};
 const path=`${id(10)}/${id(20)}/resource.pdf`;
 await login(1);await db.query("insert into unipathway_module_materials(id,tenant_id,module_id,created_by,title,kind,object_path) values($1,$2,$3,$4,'Worksheet','worksheet',$5)",[id(40),id(10),id(20),id(1),path]);
 await denied(()=>db.query("update unipathway_module_materials set publication_status='published' where id=$1",[id(40)]));
 await db.query("insert into storage.objects(bucket_id,name) values('unipathway-module-materials',$1)",[path]);
 await login(2);assert.equal((await db.query("select * from storage.objects where bucket_id='unipathway-module-materials'")).rows.length,0);checks++;
 await login(1);await db.query("update unipathway_module_materials set publication_status='published' where id=$1",[id(40)]);
 await login(2);assert.equal((await db.query("select * from storage.objects where bucket_id='unipathway-module-materials'")).rows.length,1);checks++;
 await login(3);assert.equal((await db.query("select * from storage.objects where bucket_id='unipathway-module-materials'")).rows.length,0);checks++;
 await login(1);await denied(()=>db.query("update unipathway_module_materials set object_path='other/path' where id=$1",[id(40)]));
 assert.equal((await db.query("delete from storage.objects where name=$1 returning id",[path])).rows.length,0);checks++;
 await db.query("update unipathway_module_materials set publication_status='withdrawn' where id=$1",[id(40)]);
 await login(2);assert.equal((await db.query("select * from storage.objects where bucket_id='unipathway-module-materials'")).rows.length,0);checks++;
 await db.exec('ROLLBACK');console.log(`Protected module resources: ${checks} publication and storage checks passed`);
}
