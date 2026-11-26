import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const declared=new Set();
for(const line of readFileSync('.env.example','utf8').split(/\r?\n/)){
 const match=line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=/);
 if(match)declared.add(match[1]);
}
const reviewed=new Set([...readFileSync('src/lib/activationRegister.ts','utf8').matchAll(/key:'(VITE_[A-Z0-9_]+)'/g)].map(m=>m[1]));
const references=new Map();
function walk(directory){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory()){walk(path);continue;}
  if(!/\.[jt]sx?$/.test(entry.name)||/\.(test|spec)\.[jt]sx?$/.test(entry.name)||entry.name==='activationRegister.ts')continue;
  const source=readFileSync(path,'utf8');
  for(const m of source.matchAll(/import\.meta\.env\s*(?:\.\s*(VITE_[A-Z0-9_]+)|\[\s*['"](VITE_[A-Z0-9_]+)['"]\s*\])/g)){
   const key=m[1]||m[2];
   if(!references.has(key))references.set(key,new Set());
   references.get(key).add(path);
  }
 }
}
walk('src');
const rows=[...references].sort(([a],[b])=>a.localeCompare(b)).map(([key,paths])=>({key,example:declared.has(key),reviewed:reviewed.has(key),references:paths.size}));
console.log('Static browser environment inventory (names and counts only; no values).');
console.table(rows);
const missing=rows.filter(row=>row.key.startsWith('VITE_UNIPATHWAY_')&&!row.example);
const unreviewed=rows.filter(row=>row.key.startsWith('VITE_UNIPATHWAY_')&&row.key.endsWith('_ENABLED')&&!row.reviewed);
console.log('Unlisted UniPathway client keys:',missing.map(row=>row.key).join(', ')||'none');
console.log('Unreviewed activation switches:',unreviewed.map(row=>row.key).join(', ')||'none');
console.log('Inventory is advisory; indirect references, server secrets and hosted provider status require separate review.');
