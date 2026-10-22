/** Produces a review bundle only. Does not connect to or apply SQL to any database. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {freshStagingPlan} from './lib/unipathway-fresh-staging.mjs';
const destination=process.argv[2];
if(!destination)throw new Error('Provide a new output directory for the review bundle');
const plan=freshStagingPlan();
const files=plan.files.map(file=>{
 const sql=plan.replacements.get(file)??readFileSync('supabase/migrations/'+file,'utf8');
 return {file,sql,sha256:createHash('sha256').update(sql).digest('hex'),replacement:plan.replacements.has(file)};
});
// Refuse overwriting an existing directory or creating missing parent directories.
const out=resolve(destination);mkdirSync(out);mkdirSync(join(out,'sql'));
for(const {file,sql} of files)writeFileSync(join(out,'sql',file),sql,{flag:'wx'});
writeFileSync(join(out,'plan.json'),JSON.stringify({
 scope:'Review-only fresh empty staging. NOT production upgrade or migration history repair.',
 hostedGates:['Independent staging identity verification','Guarded empty-target check','pg_cron and pg_net installation','Authenticated Auth/PostgREST/Storage/Realtime acceptance'],
 files:files.map(({sql,...entry})=>entry),overrides:plan.overrides
},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'review-bundle-built',files:files.length,overrides:plan.overrides.length,output:out,applied:false}));
