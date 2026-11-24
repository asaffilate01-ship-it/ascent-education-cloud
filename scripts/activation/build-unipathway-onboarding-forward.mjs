/** Generates reviewed SQL only; never connects to a database. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const onboardingVersions=[
  "20261124101500_onboarding_application_drafts.sql",
  "20261124120000_onboarding_module_registrations.sql",
  "20261124131500_onboarding_teaching_reviews.sql",
  "20261124133000_onboarding_application_events.sql",
  "20261124134500_onboarding_application_status.sql"
];
export function buildOnboardingActivation(){
 const read=path=>readFileSync(resolve(root,path),'utf8');
 return ['BEGIN;',"SET LOCAL lock_timeout='5s';","SET LOCAL statement_timeout='90s';",
 read('scripts/activation/unipathway-onboarding-preflight.sql'),
 ...onboardingVersions.map(file=>'-- '+file+'\n'+read('supabase/migrations/'+file)),
 read('scripts/activation/unipathway-onboarding-role-guards.sql'),'COMMIT;'].join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--print-sql')throw Error('Use --print-sql to review SQL only; hosted execution is not supported');
 process.stdout.write(buildOnboardingActivation()+'\n');
}
