/** Supabase source migration inventory and fail-closed rehearsal planning.
 * Offline mode needs no credentials; --staging additionally performs strictly
 * read-only schema checks against a separately verified, isolated staging DB.
 * No SQL migration contents are executed by this script.
 */
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifiedStagingConfig} from './lib/unipathway-staging-guard.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export const MIGRATIONS_DIR=join(root,'supabase','migrations');
const basename=/^(\d{14})_([a-zA-Z0-9._-]+)\.sql$/;
const controlledStages=[
 ['20260924070000','Base academic RLS'],
 ['20260929103000','Teams room foundation'],
 ['20260929200000','Provider-neutral lab foundation'],
 ['20261018190000','Role privilege hardening'],
 ['20261020090000','Private classroom invite access'],
 ['20261020110000','Presenter-led whiteboard'],
 ['20261020120000','Classroom Q&A'],
 ['20261020130000','Lab self-study access'],
 ['20261020140000','Browser coding workspace'],
 ['20261020150000','Independent assessment'],
 ['20261020160000','Board/certification syllabus'],
 ['20261020170000','Grade appeal gate'],
 ['20261020180000','Legacy grade isolation']
];
const riskFlags=(sql)=>{
 const warnings=[];
 // PostgreSQL disallows subselects in CHECK constraints; staging reset cannot
 // succeed if a migration contains this old pattern.
 if(/\bCHECK\s*\((?:[^;]{0,500}?)\(\s*SELECT\b/i.test(sql))
  warnings.push('CHECK_CONTAINS_SUBQUERY');
 if(/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(sql))
  warnings.push('DISABLES_RLS');
 if(/\bTRUNCATE\s+(?:TABLE\s+)?(?:public\.|auth\.|storage\.)/i.test(sql))
  warnings.push('TRUNCATES_DATA');
 if(/\bDROP\s+TABLE\s+(?!IF\s+EXISTS)/i.test(sql))
  warnings.push('DROP_TABLE_REVIEW');
 if(/\bDELETE\s+FROM\s+auth\.users\b/i.test(sql))
  warnings.push('DELETES_AUTH_USERS');
 return warnings;
};

export function inventoryMigrations({directory=MIGRATIONS_DIR,appliedVersions=[]}={}){
 const rawNames=readdirSync(directory).filter(x=>x.endsWith('.sql')).sort();
 const versions=new Set(),duplicate=[],misnamed=[];
 const applied=new Set(appliedVersions.map(String));
 const files=[];
 for(const file of rawNames){
  const match=file.match(basename);
  if(!match){misnamed.push(file);continue;}
  const version=match[1];
  if(versions.has(version))duplicate.push(version);
  versions.add(version);
  const sql=readFileSync(join(directory,file),'utf8');
  files.push({
   version,file,bytes:Buffer.byteLength(sql,'utf8'),
   sha256:createHash('sha256').update(sql).digest('hex'),
   status:applied.has(version)?'applied':'pending',
   flags:riskFlags(sql),
   createsTables:[...sql.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi)]
      .map(x=>x[1]).slice(0,80),
   touchesPolicy:/\bCREATE\s+POLICY\b|\bDROP\s+POLICY\b/i.test(sql),
   touchesStorage:/\bstorage\.(?:objects|buckets)\b/i.test(sql),
   touchesAuth:/\bauth\.(?:users|uid|jwt)\b/i.test(sql),
   safeguardsBegin:/\bBEGIN\s*;/i.test(sql),
  });
 }
 const expected=controlledStages.map(([version,description])=>({
  version,description,present:files.some(f=>f.version===version),
  applied:applied.has(version)
 }));
 const blocking=files.filter(f=>f.flags.length>0);
 return {
  generatedFrom:'repository SQL files (no database modifications)',
  fileCount:files.length,appliedCount:files.filter(f=>f.status==='applied').length,
  pendingCount:files.filter(f=>f.status==='pending').length,
  duplicateVersions:duplicate,nonstandardNames:misnamed,
  criticalFiles:blocking.map(f=>({version:f.version,file:f.file,flags:f.flags})),
  expected,files
 };
}
function concise(plan){
 return {
  count:plan.fileCount,applied:plan.appliedCount,pending:plan.pendingCount,
  duplicateVersions:plan.duplicateVersions,misnamed:plan.nonstandardNames,
  criticalFiles:plan.criticalFiles,requiredStages:plan.expected
 };
}
export async function inspectStagingDatabase(env=process.env){
 // No read/write access to PostgreSQL until all project identity checks pass.
 const config=verifiedStagingConfig(env,{directDb:true});
 const postgres=(await import('postgres')).default;
 const connection=postgres(env.STAGING_DATABASE_URL,{
  ssl:'require',max:1,prepare:false,connect_timeout:8,
  idle_timeout:5,connection:{application_name:'unipathway_staging_readonly_preflight'}
 });
 try{
  return await connection.begin(async sql=>{
   await sql.unsafe('SET TRANSACTION READ ONLY');
   const info=await sql`
    SELECT current_database() AS db,
      (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname='public') AS public_tables,
      to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS registry_exists
   `;
   let versions=[];
   if(info[0].registry_exists){
    const res=await sql.unsafe('SELECT version::text AS version FROM supabase_migrations.schema_migrations');
    versions=res.map(x=>x.version);
   }
   const safeRows=await sql`
    SELECT tablename,rowSecurity FROM (
      SELECT tablename,rowsecurity AS rowSecurity FROM pg_tables WHERE schemaname='public'
    ) q ORDER BY tablename LIMIT 300
   `;
   return {
    stagingRef:config.stagingRef,publicTables:info[0].public_tables,
    hasMigrationRegistry:info[0].registry_exists,
    appliedVersions:versions,
    publicRlsOff:safeRows.filter(x=>!x.rowsecurity).map(x=>x.tablename)
   };
  });
 }finally{await connection.end({timeout:2});}
}

async function main(){
 const args=new Set(process.argv.slice(2));
 const remote=args.has('--staging');
 const strict=args.has('--strict');
 const json=args.has('--json');
 let inspection;
 if(remote)inspection=await inspectStagingDatabase();
 const plan=inventoryMigrations({appliedVersions:inspection?.appliedVersions||[]});
 if(json)console.log(JSON.stringify({summary:concise(plan),staging:inspection||null},null,2));
 else{
  console.log('UniPathway SQL source inventory: '+plan.fileCount+' migrations; '+plan.pendingCount+' pending in '+(remote?'verified staging':'offline mode'));
  for(const item of plan.criticalFiles)console.log('BLOCKER '+item.file+': '+item.flags.join(', '));
  for(const item of plan.expected)console.log((item.present?'FOUND':'MISSING')+' '+item.version+' '+item.description+(remote?' '+(item.applied?'applied':'pending'):''));
  if(inspection)console.log('Staging: '+inspection.publicTables+' public tables; '+inspection.publicRlsOff.length+' public tables without RLS.');
  console.log('Nothing was modified. A passing static inventory is NOT a database migration rehearsal.');
 }
 const essentialMissing=plan.expected.some(x=>!x.present);
 if(plan.duplicateVersions.length||plan.nonstandardNames.length||essentialMissing)process.exitCode=2;
 if(strict&&(plan.criticalFiles.length||inspection?.publicRlsOff?.length))process.exitCode=2;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(err=>{console.error('Staging migration preflight blocked: '+err.message);process.exitCode=2;});
}
