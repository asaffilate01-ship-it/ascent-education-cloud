import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function freshStagingPlan(){
 const manifest=JSON.parse(readFileSync('supabase/fresh-staging/manifest.json','utf8'));
 const digest=(value)=>createHash('sha256').update(value).digest('hex');
 const replacements=new Map();
 for(const item of manifest.overrides){
  if(!/^[0-9]+_[a-zA-Z0-9_-]+\.sql$/.test(item.file)||replacements.has(item.file))throw new Error('Invalid baseline entry');
  const source=readFileSync('supabase/migrations/'+item.file,'utf8');
  const replacement=readFileSync('supabase/fresh-staging/'+item.file,'utf8');
  if(digest(source)!==item.sourceSha256||digest(replacement)!==item.replacementSha256)throw new Error('Baseline checksum mismatch: '+item.file);
  replacements.set(item.file,replacement);
 }
 const files=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
 return {overrides:manifest.overrides,replacements,files};
}
