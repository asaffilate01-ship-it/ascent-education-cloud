// Deliberately isolated forward-only employer privacy patch: no historical migration replay.
// This printer does not connect to hosted Supabase. Default is ROLLBACK.
import {fileURLToPath} from 'node:url';

export function employerPrivacySql(commit = false) {
 return `-- Run on independently confirmed UniPathway backend ONLY after staging rehearsal.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
 IF to_regclass('public.unipathway_employer_organisations') IS NULL OR
    to_regclass('public.unipathway_employer_memberships') IS NULL OR
    to_regclass('public.unipathway_employer_opportunities') IS NULL OR
    to_regclass('public.unipathway_employer_applications') IS NULL
 THEN RAISE EXCEPTION 'Existing employer activation required; do not replay foundation migrations'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='unipathway_employer_applications'
      -- PostgreSQL truncates policy identifiers to 63 bytes (PGlite may retain
      -- the full spelling); both resolve to the same quoted ALTER POLICY target.
      AND policyname IN ('Verified employers read consenting applicants for own opportunities',
                         'Verified employers read consenting applicants for own opportuni'))
 THEN RAISE EXCEPTION 'Expected applicant access policy missing; manual reconciliation required'; END IF;
END;
$preflight$;
-- Withdrawal must immediately remove the applicant from future employer reads.
-- Centre and student audit policies remain untouched.
ALTER POLICY "Verified employers read consenting applicants for own opportunities"
 ON public.unipathway_employer_applications
 USING (status <> 'withdrawn' AND applicant_consent_at IS NOT NULL AND
  EXISTS(SELECT 1 FROM public.unipathway_employer_opportunities p
   WHERE p.id=opportunity_id AND p.tenant_id=unipathway_employer_applications.tenant_id
    AND public.unipathway_verified_employer_member(p.organisation_id,auth.uid())));
-- Preserve the existing guarded trigger, but disallow expired applications,
-- forged initial statuses and resurrection after withdrawal.
CREATE OR REPLACE FUNCTION public.unipathway_guard_employer_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $candidate_guard$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status <> 'submitted' THEN
   RAISE EXCEPTION 'New applications must begin submitted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.unipathway_employer_opportunities p
   JOIN public.unipathway_employer_organisations o ON o.id=p.organisation_id
   WHERE p.id=NEW.opportunity_id AND p.tenant_id=NEW.tenant_id
     AND p.status='published' AND o.status='verified'
     AND (p.application_deadline IS NULL
       OR p.application_deadline >= (now() AT TIME ZONE 'Asia/Karachi')::date))
  THEN RAISE EXCEPTION 'Only open published verified roles accept applications'; END IF;
 ELSE
  IF OLD.tenant_id<>NEW.tenant_id OR OLD.opportunity_id<>NEW.opportunity_id
     OR OLD.student_id<>NEW.student_id THEN
   RAISE EXCEPTION 'Cannot change application ownership';
  END IF;
  -- The application, original consent and audit identity are immutable.
  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     NEW.applicant_consent_at IS DISTINCT FROM OLD.applicant_consent_at OR
     NEW.statement IS DISTINCT FROM OLD.statement
  THEN RAISE EXCEPTION 'Application identity, statement and consent cannot be changed'; END IF;
  -- Enforce the same state machine on direct API requests as on the centre UI.
  -- Late-stage withdrawals can be recorded by authorised centre staff,
  -- while direct student withdrawal is restricted by the existing RLS rule.
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status='submitted' AND NEW.status IN ('screening','declined','withdrawn'))
    OR (OLD.status='screening' AND NEW.status IN ('shortlisted','declined','withdrawn'))
    OR (OLD.status='shortlisted' AND NEW.status IN ('accepted','declined','withdrawn'))
    OR (OLD.status IN ('accepted','declined') AND NEW.status='withdrawn')
  ) THEN RAISE EXCEPTION 'Invalid application status transition'; END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END;
$candidate_guard$;
-- No client may invoke the trigger function directly.
REVOKE ALL ON FUNCTION public.unipathway_guard_employer_application()
 FROM PUBLIC,anon,authenticated;
NOTIFY pgrst, 'reload schema';
${commit ? 'COMMIT' : 'ROLLBACK'};
`;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).some(arg=>arg!=='--commit')) throw new Error('Only --commit is supported');
 process.stdout.write(employerPrivacySql(process.argv.includes('--commit')));
}
