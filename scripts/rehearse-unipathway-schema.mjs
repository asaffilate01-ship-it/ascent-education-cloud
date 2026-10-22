/** Offline PostgreSQL schema rehearsal. Never connects to a hosted database.
 * Supabase-owned Auth/Storage scaffolding is synthetic, not provider acceptance.
 * Stops at the first SQL error; no migration is silently skipped.
 */
import {PGlite} from '@electric-sql/pglite';
import {freshStagingPlan} from './lib/unipathway-fresh-staging.mjs';
import {verifyGuardianResults} from './lib/verify-unipathway-guardian-results.mjs';
import {verifyFreshSchema} from './lib/verify-unipathway-fresh-schema.mjs';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFileSync,readdirSync} from 'node:fs';
const fresh=process.argv.includes('--fresh-staging');
const {overrides,replacements}=fresh?freshStagingPlan():{overrides:[],replacements:new Map()};
console.log(JSON.stringify({mode:fresh?'fresh-staging':'original-history',reviewedOverrides:overrides.map(({file,reason})=>({file,reason}))}));
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, email text,raw_user_meta_data jsonb DEFAULT '{}',raw_app_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(), updated_at timestamptz, instance_id uuid, encrypted_password text, email_confirmed_at timestamptz, aud text,role text,confirmation_token text,recovery_token text,email_change_token_new text,email_change text,email_change_token_current text,phone_change text,phone_change_token text,reauthentication_token text,email_change_confirm_status int DEFAULT 0,phone text,phone_confirmed_at timestamptz,confirmation_sent_at timestamptz,recovery_sent_at timestamptz,email_change_sent_at timestamptz,phone_change_sent_at timestamptz);
 CREATE TABLE auth.identities(id uuid PRIMARY KEY, user_id uuid, identity_data jsonb,provider text,provider_id text,last_sign_in_at timestamptz,created_at timestamptz,updated_at timestamptz,UNIQUE(provider_id,provider));
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;
 CREATE SCHEMA realtime;
 CREATE TABLE realtime.messages(id bigint,extension text);
 ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic',true) $$;
 -- Transport deliberately unavailable: schema fixture cannot certify broadcast delivery.
 CREATE PUBLICATION supabase_realtime;
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
 `);
 let passed=0;
 const deferred=[];
 for(const file of readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort()){
  if(fresh&&process.argv.includes('--defer-provider-extensions')&&file==='20260317154657_9359eb22-6dd9-4b52-bb9f-de4d4f9f6d49.sql'){
   const sql=readFileSync('supabase/migrations/'+file,'utf8').trim();
   if(sql!=='CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;\nCREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;')throw new Error('Provider extension migration changed; review required');
   deferred.push(file);continue;
  }
  try{await db.exec(replacements.get(file)??readFileSync('supabase/migrations/'+file,'utf8'));passed++;}
  catch(error){console.error(JSON.stringify({status:'blocked',passed,file,code:error.code,message:error.message}));process.exitCode=1;break;}
 }
 if(!process.exitCode&&fresh){await verifyFreshSchema(db);await verifyGuardianResults(db);}
 if(!process.exitCode)console.log(JSON.stringify({status:deferred.length?'schema-only-provider-acceptance-pending':'passed',deferred,migrations:passed,scope:'Offline PostgreSQL with synthetic Auth/Storage; no live acceptance'}));
}catch(error){console.error(JSON.stringify({status:'verification-failed',code:error.code,message:error.message}));process.exitCode=1;}finally{await db.close();}
