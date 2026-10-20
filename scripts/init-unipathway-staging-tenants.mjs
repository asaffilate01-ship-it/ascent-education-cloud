/** Optional tenant bootstrap after the isolated Supabase staging schema exists.
 * Creates two explicitly named fictitious QA tenants, never production tenants.
 * No credentials printed; no real student data copied.
 */
import {createClient} from '@supabase/supabase-js';
import {fileURLToPath} from 'node:url';
import {verifiedStagingConfig} from './lib/unipathway-staging-guard.mjs';

const tenants=[
 {slot:'a',slug:'unipathway-qa-tenant-a',name:'UniPathway QA Centre A — Synthetic'},
 {slot:'b',slug:'unipathway-qa-tenant-b',name:'UniPathway QA Centre B — Synthetic'}
];
export async function prepareSyntheticTenants(env=process.env,{apply=false}={}){
 const project=verifiedStagingConfig(env,{write:apply});
 if(!apply)return {mode:'plan',stagingRef:project.stagingRef,tenants};
 if(env.APP_ENV!=='staging'||env.UNIPATHWAY_ISOLATED_STAGING_SEED!=='true')
  throw Error('Synthetic tenant creation requires isolated staging environment');
 const secret=String(env.STAGING_SERVICE_ROLE_KEY||'');
 if(secret.length<30)throw Error('Missing protected staging service-role credential');
 const client=createClient(project.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const results={};
 for(const t of tenants){
  const found=await client.from('tenants').select('id,slug,name').eq('slug',t.slug).maybeSingle();
  if(found.error)throw Error('Cannot read staging tenant registry; migrations missing');
  if(found.data){
   if(found.data.name!==t.name)throw Error('A staging tenant slug is already occupied by a different record');
   results[t.slot]={id:found.data.id,status:'existing'};
   continue;
  }
  const added=await client.from('tenants').insert({
   slug:t.slug,name:t.name,status:'active',plan:'starter',brand_name:'UniPathway Synthetic QA',
   primary_color:'#0B2D5B',accent_color:'#16A34A'
  }).select('id').single();
  if(added.error||!added.data?.id)
   throw Error('Cannot create synthetic QA tenant '+t.slot+'; review schema and role permissions');
  results[t.slot]={id:added.data.id,status:'created'};
 }
 return {
  mode:'applied',stagingRef:project.stagingRef,tenants:results,
  tenantConfiguration:{a:results.a?.id,b:results.b?.id},
  note:'Set protected STAGING_TENANTS_JSON from tenantConfiguration. No production records were read or copied.'
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const apply=process.argv.includes('--apply');
 if(apply===process.argv.includes('--plan')){
  console.error('Choose exactly one of --plan or --apply');process.exitCode=2;
 }else prepareSyntheticTenants(process.env,{apply})
 .then(x=>console.log(JSON.stringify(x,null,2)))
 .catch(e=>{console.error('Staging tenant bootstrap blocked: '+e.message);process.exitCode=2;});
}
