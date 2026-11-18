import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const has=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);

/**
 * Deterministic, dependency-free fail-fast check. npm ci is still the
 * authoritative install/integrity test; this explains root-lock drift before
 * seven expensive CI jobs each try the same broken installation.
 */
export function checkManifestLock(manifest,lock){
 const problems=[];
 if(!manifest||typeof manifest!=='object'||!lock||typeof lock!=='object')
  return ['Manifest and lockfile must be JSON objects'];
 if(lock.lockfileVersion!==3)problems.push('Expected npm lockfileVersion 3');
 if(!lock.packages||!lock.packages[''])
  return [...problems,'Missing root package-lock packages entry'];
 const entry=lock.packages[''];
 if(manifest.name!==entry.name)problems.push('Root package name differs');
 const kinds=['dependencies','devDependencies','optionalDependencies'];
 const seen=new Map();
 for(const kind of kinds){
  const declared=manifest[kind]||{};
  const locked=entry[kind]||{};
  for(const [name,spec] of Object.entries(declared)){
   if(seen.has(name))problems.push(`Duplicate direct dependency ${name} in ${kind} and ${seen.get(name)}`);
   seen.set(name,kind);
   if(!has(locked,name)||locked[name]!==spec)
    problems.push(`Manifest/lock mismatch in ${kind}: ${name}`);
   const packageEntry=lock.packages[`node_modules/${name}`];
   if(!packageEntry||typeof packageEntry.version!=='string'||!packageEntry.version)
    problems.push(`Missing locked package version: ${name}`);
   else if(!packageEntry.link&&(!packageEntry.resolved||!packageEntry.integrity))
    problems.push(`Missing resolved tarball/integrity: ${name}`);
  }
  for(const name of Object.keys(locked))if(!has(declared,name))
   problems.push(`Stale ${kind} entry in package-lock: ${name}`);
 }
 return [...new Set(problems)].sort();
}

export function verifyRepositoryLock(repoRoot=root){
 const manifest=JSON.parse(readFileSync(resolve(repoRoot,'package.json'),'utf8'));
 const lock=JSON.parse(readFileSync(resolve(repoRoot,'package-lock.json'),'utf8'));
 return checkManifestLock(manifest,lock);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const issues=verifyRepositoryLock();
 if(issues.length){
  for(const issue of issues)console.error(`Lockfile preflight: ${issue}`);
  process.exitCode=1;
 }else console.log('Lockfile preflight passed: root manifest and pinned package metadata agree.');
}
