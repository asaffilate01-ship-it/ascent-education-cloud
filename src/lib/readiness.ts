import type {EducationTables} from '@/integrations/supabase/education-types';
import {parseZonedAcademicTimestamp} from '@/lib/academicTime';
export type ReadinessCheck=EducationTables['production_readiness_checks']['Row'];
export const baselineChecks=['full_migration_replay','tenant_role_isolation','student_lifecycle_e2e','course_materials_approved','centre_and_qualification_approvals','backup_restore_drill','live_payment_reconciliation','teams_classroom_smoke_test','partner_agreement_verification','publication_release_verified','institutional_email_e2e','omniqora_ai_e2e','language_room_audio_e2e','cloud_lab_lifecycle_e2e','assessment_annotation_and_history','scorm_lti_content_e2e','offline_restart_and_sync','guardian_child_isolation','sponsor_liability_reconciliation','nadra_approved_connection','cctv_security_playback','public_contact_and_course_information','desktop_mobile_task_flows'];
/**
 * These launch blockers cannot be cleared by a local "not applicable" review.
 * A controlled pilot may explicitly defer other capabilities (for example,
 * CCTV or NADRA where no physical centre is in scope), but core security,
 * recovery, approved teaching and production release require a current PASS.
 * This is read-only dashboard gating; backend policy remains authoritative.
 */
export const nonWaivableLaunchChecks:readonly string[]=[
 'full_migration_replay','tenant_role_isolation','student_lifecycle_e2e',
 'course_materials_approved','centre_and_qualification_approvals',
 'backup_restore_drill','live_payment_reconciliation','teams_classroom_smoke_test',
 'partner_agreement_verification','publication_release_verified',
 'guardian_child_isolation','sponsor_liability_reconciliation',
 'public_contact_and_course_information','desktop_mobile_task_flows',
];
const nonWaivable=new Set(nonWaivableLaunchChecks);
export const healthMaxAgeMs=24*60*60*1000;
export function integrationCurrent(integration:EducationTables['production_integrations']['Row'],now:number){
 const stamp=parseZonedAcademicTimestamp(integration.last_health_at);
 return integration.status==='healthy'&&Number.isFinite(now)&&stamp!==null&&stamp<=now&&now-stamp<healthMaxAgeMs;
}
export function evidenceCurrent(check:ReadinessCheck,now:number){
 const reviewed=parseZonedAcademicTimestamp(check.checked_at);
 if(!Number.isFinite(now)||!check.checked_by||reviewed===null||reviewed>now||!check.evidence_reference?.trim())return false;
 if(check.status==='not_applicable')return Boolean(check.notes?.trim());
 const expiry=parseZonedAcademicTimestamp(check.valid_until);
 return check.status==='pass'&&expiry!==null&&expiry>now;
}
/** A justified exemption is never a substitute for a critical go-live pass. */
export function readinessCheckCurrent(check:ReadinessCheck,now:number):boolean{
 return (!nonWaivable.has(check.check_key)||check.status==='pass')&&evidenceCurrent(check,now);
}
export function readinessGaps(checks:ReadinessCheck[],integrations:EducationTables['production_integrations']['Row'][],now:number){
 const missing=baselineChecks.filter(key=>!checks.some(c=>c.check_key===key));
 const required=new Set(['microsoft_education','institutional_payments',...integrations.filter(i=>i.required_for_launch).map(i=>i.integration_key)]);
 return {missing,checks:missing.length+checks.filter(c=>!readinessCheckCurrent(c,now)).length,integrations:[...required].filter(key=>!integrations.some(i=>i.integration_key===key&&integrationCurrent(i,now))).length};
}

/**
 * Validate a complete centre-scoped launch snapshot before calculating gates,
 * rendering provider records, or exposing any check's review controls.
 * RLS is still authoritative. This is independent containment and duplicate
 * detection if a paginated API response is inconsistent or corrupted.
 */
export type ReadinessIntegration=EducationTables['production_integrations']['Row'];
export type ReadinessReview=EducationTables['production_readiness_reviews']['Row'];
export type VerifiedReadinessSnapshot=Readonly<{
 integrations:ReadinessIntegration[];
 checks:ReadinessCheck[];
}>;
const readinessId=(value:unknown):value is string=>
 typeof value==='string'&&value.trim().length>0&&value.length<=128;
const nullableText=(value:unknown):value is string|null=>
 value===null||typeof value==='string';
function readinessRows(value:unknown,limit=10000):Record<string,unknown>[]{
 if(!Array.isArray(value)||value.length>limit)throw Error('Unverified or incomplete launch-readiness evidence');
 return value.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Unverified launch-readiness record');
  return row as Record<string,unknown>;
 });
}
export function verifyReadinessSnapshot(
 rawIntegrations:unknown,rawChecks:unknown,tenantId:string,
):VerifiedReadinessSnapshot{
 if(!readinessId(tenantId))throw Error('Verified centre required for launch review');
 const integrationIds=new Set<string>(),integrationKeys=new Set<string>();
 const integrations=readinessRows(rawIntegrations).map(row=>{
  if(!readinessId(row.id)||integrationIds.has(row.id)||
   !readinessId(row.integration_key)||integrationKeys.has(row.integration_key)||
   row.tenant_id!==tenantId||!readinessId(row.category)||
   !readinessId(row.status)||typeof row.required_for_launch!=='boolean'||
   !nullableText(row.last_health_at)||!nullableText(row.last_error))
   throw Error('Integration evidence failed centre or uniqueness verification');
  integrationIds.add(row.id);integrationKeys.add(row.integration_key);
  return row as unknown as ReadinessIntegration;
 });
 const checkIds=new Set<string>(),checkKeys=new Set<string>();
 const allowedStatuses=new Set(['pending','pass','fail','blocked','not_applicable']);
 const checks=readinessRows(rawChecks).map(row=>{
  if(!readinessId(row.id)||checkIds.has(row.id)||
   !readinessId(row.check_key)||checkKeys.has(row.check_key)||
   row.tenant_id!==tenantId||!readinessId(row.category)||
   !allowedStatuses.has(String(row.status))||
   typeof row.revision!=='number'||!Number.isSafeInteger(row.revision)||row.revision<0||
   !nullableText(row.evidence_reference)||!nullableText(row.checked_at)||
   !nullableText(row.checked_by)||!nullableText(row.notes)||
   !nullableText(row.valid_until))
   throw Error('Launch check failed centre or revision verification');
  checkIds.add(row.id);checkKeys.add(row.check_key);
  return row as unknown as ReadinessCheck;
 });
 return {integrations,checks};
}

/** A foreign or duplicated review must never appear as this check's audit. */
export function verifyReadinessHistory(
 raw:unknown,check:Pick<ReadinessCheck,'id'|'tenant_id'>,
):ReadinessReview[]{
 const ids=new Set<string>(),revisions=new Set<number>();
 return readinessRows(raw,20).map(row=>{
  if(!readinessId(row.id)||ids.has(row.id)||
   row.tenant_id!==check.tenant_id||row.check_id!==check.id||
   typeof row.revision!=='number'||!Number.isSafeInteger(row.revision)||
   row.revision<1||revisions.has(row.revision)||
   !readinessId(row.old_status)||!readinessId(row.new_status)||
   !readinessId(row.reviewed_by)||
   parseZonedAcademicTimestamp(row.created_at)===null||
   !nullableText(row.evidence_reference)||!nullableText(row.notes)||
   !nullableText(row.valid_until))
   throw Error('Review history failed centre, check or revision verification');
  ids.add(row.id);revisions.add(row.revision);
  return row as unknown as ReadinessReview;
 }).sort((a,b)=>b.revision-a.revision);
}
