import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const digest='a'.repeat(64);
let checks=0;
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
await db.exec(readFileSync('supabase/migrations/20261017211500_public_enquiry_abuse_guard.sql','utf8'));
async function as(role,callback){
 await db.exec('SET ROLE '+role);
 try{return await callback();}finally{await db.exec('RESET ROLE');}
}
await as('anon',async()=>{
 await assert.rejects(()=>db.query('SELECT public.consume_unipathway_enquiry_quota($1,4)',[digest]));checks++;
 await assert.rejects(()=>db.query('SELECT digest FROM public.unipathway_enquiry_quotas'));checks++;
});
await as('authenticated',async()=>{
 await assert.rejects(()=>db.query('SELECT public.consume_unipathway_enquiry_quota($1,4)',[digest]));checks++;
 await assert.rejects(()=>db.query('UPDATE public.unipathway_enquiry_quotas SET hits=0'));checks++;
});
await as('service_role',async()=>{
 for(let i=0;i<4;i++){
  const r=await db.query('SELECT public.consume_unipathway_enquiry_quota($1,4) AS allowed',[digest]);
  assert.equal(r.rows[0].allowed,true);checks++;
 }
 const fifth=await db.query('SELECT public.consume_unipathway_enquiry_quota($1,4) AS allowed',[digest]);
 assert.equal(fifth.rows[0].allowed,false);checks++;
 const records=await db.query('SELECT digest,hits FROM public.unipathway_enquiry_quotas WHERE digest=$1',[digest]);
 assert.equal(records.rows.length,1);
 assert.equal(records.rows[0].hits,5);checks++;
 await assert.rejects(()=>db.query('SELECT public.consume_unipathway_enquiry_quota($1,4)',["short"]));checks++;
 await assert.rejects(()=>db.query('SELECT public.consume_unipathway_enquiry_quota($1,1000)',[digest]));checks++;
 const other=await db.query('SELECT public.consume_unipathway_enquiry_quota($1,4) AS allowed',['b'.repeat(64)]);
 assert.equal(other.rows[0].allowed,true);checks++;
});
await db.close();
console.log('Durable public enquiry quota, atomic limits and role isolation passed ('+checks+' checks).');
