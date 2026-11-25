// Generate a narrow installation for the confirmed missing legacy physical tables only.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
export function buildSiteOperations(){
 const tables=['centre_access_credentials','centre_visitors','centre_access_events','centre_occupancy','centre_security_zones','cctv_cameras','cctv_view_sessions','emergency_muster_events','emergency_muster_status','centre_access_zone_permissions','security_devices','security_incidents'];
 const preflight=`DO $pre$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY[${tables.map(n=>"'"+n+"'").join(',')}] LOOP
 IF to_regclass('public.'||n) IS NOT NULL THEN RAISE EXCEPTION 'Existing physical table %; reconcile instead of replay',n; END IF; END LOOP;
 IF to_regclass('public.unipathway_cctv_cameras') IS NULL OR to_regclass('public.cctv_access_events') IS NULL OR to_regclass('public.student_enrolments') IS NULL THEN RAISE EXCEPTION 'Missing verified CCTV or enrolment prerequisite'; END IF;
 IF to_regnamespace('unipathway_security') IS NOT NULL OR to_regnamespace('unipathway_site_ops') IS NOT NULL THEN RAISE EXCEPTION 'Existing security schema; reconcile before applying'; END IF; END $pre$;`;
 const source=['20260929180000_centre_access_occupancy.sql','20260929183000_cctv_muster_security.sql','20260929190000_physical_security_phase3.sql'].map(n=>{
  const s=read('supabase/migrations/'+n),i=s.toLowerCase().indexOf('alter table public.');
  if(i<0)throw Error('Unexpected physical DDL source '+n);return s.slice(0,i);
 });
 const grants=tables.map(n=>`ALTER TABLE public.${n} ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.${n} FROM PUBLIC,anon,authenticated;`).join('\n');
 const core=read('scripts/activation/unipathway-physical-security-operations-forward.sql').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
 return ['BEGIN;',"SET LOCAL lock_timeout='5s';","SET LOCAL statement_timeout='90s';",preflight,...source,grants,core,read('scripts/activation/unipathway-site-operations-forward.sql'),'COMMIT;'].join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv[2]!=='--print-sql')throw Error('SQL generation only; no hosted execution');process.stdout.write(buildSiteOperations()+'\n');}
