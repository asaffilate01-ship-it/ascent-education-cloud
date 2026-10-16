import type {EducationTables} from '@/integrations/supabase/education-types';
export type ReadinessCheck=EducationTables['production_readiness_checks']['Row'];
export const baselineChecks=['full_migration_replay','tenant_role_isolation','student_lifecycle_e2e','course_materials_approved','centre_and_qualification_approvals','backup_restore_drill','live_payment_reconciliation','teams_classroom_smoke_test','partner_agreement_verification'];
export function evidenceCurrent(check:ReadinessCheck,now:number){
 if(!check.checked_by||!check.checked_at||!check.evidence_reference?.trim())return false;
 return check.status==='not_applicable'?Boolean(check.notes?.trim()):check.status==='pass'&&Boolean(check.valid_until)&&Date.parse(check.valid_until!)>now;
}
export function readinessGaps(checks:ReadinessCheck[],integrations:EducationTables['production_integrations']['Row'][],now:number){
 const missing=baselineChecks.filter(key=>!checks.some(c=>c.check_key===key));
 const required=new Set(['microsoft_education','institutional_payments',...integrations.filter(i=>i.required_for_launch).map(i=>i.integration_key)]);
 return {missing,checks:missing.length+checks.filter(c=>!evidenceCurrent(c,now)).length,integrations:[...required].filter(key=>!integrations.some(i=>i.integration_key===key&&i.status==='healthy'&&i.last_health_at)).length};
}
