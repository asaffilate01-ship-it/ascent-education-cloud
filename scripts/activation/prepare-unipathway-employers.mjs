import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// SQL preparation only: no database connection, no provider calls, rollback default.
export const employerMigrations = [
 '20261018230000_unipathway_employer_opportunities.sql',
 '20261029212200_employer_explicit_privileges.sql',
];
export function employerActivationSql(commit = false) {
 const sources = employerMigrations.map(name => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8')
  .replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, ''));
 return `-- Selected additive employer activation; refuse partial/existing installations.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.tenants WHERE slug='unipathway')<>1 THEN
  RAISE EXCEPTION 'Exactly one UniPathway centre required';
 END IF;
 IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL OR
    to_regprocedure('public.get_user_tenant_id(uuid)') IS NULL THEN
  RAISE EXCEPTION 'Existing role and tenant helpers required';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname LIKE 'unipathway_employer_%') OR
 EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
   'unipathway_verified_employer_member','unipathway_assert_employer_tenant',
   'unipathway_assert_employer_opportunity','unipathway_student_verified_employer',
   'unipathway_guard_employer_application')) THEN
  RAISE EXCEPTION 'Employer schema already or partially installed; reconcile instead of replaying';
 END IF;
END $$;
${sources.join('\n')}
NOTIFY pgrst, 'reload schema';
SELECT count(*) AS employer_tables_with_rls FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 AND c.relname IN ('unipathway_employer_organisations','unipathway_employer_memberships',
 'unipathway_employer_opportunities','unipathway_employer_applications') AND c.relrowsecurity;
${commit ? 'COMMIT' : 'ROLLBACK'};
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
 if (process.argv.slice(2).some(arg => arg !== '--commit')) throw new Error('Only --commit is supported');
 process.stdout.write(employerActivationSql(process.argv.includes('--commit')));
}
