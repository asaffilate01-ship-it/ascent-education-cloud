/** Verified, fail-closed connection guard for UniPathway staging tooling.
 * Never import this helper into the browser bundle.
 */
const refPattern=/^[a-z0-9]{20}$/;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESERVED_UNVERIFIED_REF='sthrhcmjypwuorlbscfw';
export const STAGING_ACK='UNIPATHWAY_STAGING_ONLY';
export const STAGING_WRITE_ACK='I_APPROVE_ISOLATED_STAGING_FIXTURES';

export function verifiedStagingConfig(env=process.env,{write=false,directDb=false}={}){
 const ack=env.STAGING_RUN_ACK;
 if(ack!==STAGING_ACK)throw Error('Protected staging acknowledgement is required');
 const stagingRef=String(env.STAGING_PROJECT_REF||'').trim().toLowerCase();
 const productionRef=String(env.UNIPATHWAY_PRODUCTION_PROJECT_REF||'').trim().toLowerCase();
 if(!refPattern.test(stagingRef)||!refPattern.test(productionRef))
  throw Error('Staging and production Supabase refs must be validated 20-character refs');
 if(stagingRef===productionRef||stagingRef===RESERVED_UNVERIFIED_REF)
  throw Error('Refusing production or ambiguous Supabase repository project');
 const url=String(env.STAGING_SUPABASE_URL||'');
 let parsed;
 try{parsed=new URL(url)}catch{throw Error('A verified staging API URL is required')}
 if(parsed.protocol!=='https:'||parsed.hostname!==stagingRef+'.supabase.co'
  ||parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password)
  throw Error('Staging API hostname must match its independently verified Supabase ref');
 if(write&&env.UNIPATHWAY_STAGING_WRITE_ACK!==STAGING_WRITE_ACK)
  throw Error('Explicit staging fixture write approval required');
 if(directDb){
  let db;
  try{db=new URL(String(env.STAGING_DATABASE_URL||''))}catch{throw Error('Missing staging-only direct database URL')}
  if(!['postgresql:','postgres:'].includes(db.protocol)
    ||db.hostname!=='db.'+stagingRef+'.supabase.co'
    ||db.username!=='postgres'||db.pathname!=='/postgres'||!db.password)
    throw Error('Direct database host must be the verified staging database, never a pooler or production');
 }
 return Object.freeze({stagingRef,productionRef,url});
}
export function validFixtureUuid(value){
 return typeof value==='string'&&uuidPattern.test(value);
}
export function validatedStagingTenantIds(value){
 let data;
 try{data=typeof value==='string'?JSON.parse(value):value}catch{throw Error('Invalid staging tenant JSON')}
 if(!validFixtureUuid(data?.a)||!validFixtureUuid(data?.b)||data.a===data.b)
  throw Error('Exactly two distinct UUIDs are required for isolated staging tenants');
 return {a:data.a,b:data.b};
}
