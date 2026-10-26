import type {EducationTables} from '@/integrations/supabase/education-types';
export type ReadinessCheck=EducationTables['production_readiness_checks']['Row'];
export const baselineChecks=['full_migration_replay','tenant_role_isolation','student_lifecycle_e2e','course_materials_approved','centre_and_qualification_approvals','backup_restore_drill','live_payment_reconciliation','teams_classroom_smoke_test','partner_agreement_verification','publication_release_verified','institutional_email_e2e','omniqora_ai_e2e','language_room_audio_e2e','cloud_lab_lifecycle_e2e','assessment_annotation_and_history','scorm_lti_content_e2e','offline_restart_and_sync','guardian_child_isolation','sponsor_liability_reconciliation','nadra_approved_connection','cctv_security_playback','public_contact_and_course_information','desktop_mobile_task_flows'];
export const healthMaxAgeMs=24*60*60*1000;
export function integrationCurrent(integration:EducationTables['production_integrations']['Row'],now:number){
 const stamp=Date.parse(integration.last_health_at||'');
 return integration.status==='healthy'&&Number.isFinite(stamp)&&stamp<=now&&now-stamp<healthMaxAgeMs;
}
export function evidenceCurrent(check:ReadinessCheck,now:number){
 const reviewed=Date.parse(check.checked_at||'');
 if(!check.checked_by||!Number.isFinite(reviewed)||reviewed>now||!check.evidence_reference?.trim())return false;
 return check.status==='not_applicable'?Boolean(check.notes?.trim()):check.status==='pass'&&Boolean(check.valid_until)&&Date.parse(check.valid_until!)>now;
}
export function readinessGaps(checks:ReadinessCheck[],integrations:EducationTables['production_integrations']['Row'][],now:number){
 const missing=baselineChecks.filter(key=>!checks.some(c=>c.check_key===key));
 const required=new Set(['microsoft_education','institutional_payments',...integrations.filter(i=>i.required_for_launch).map(i=>i.integration_key)]);
 return {missing,checks:missing.length+checks.filter(c=>!evidenceCurrent(c,now)).length,integrations:[...required].filter(key=>!integrations.some(i=>i.integration_key===key&&integrationCurrent(i,now))).length};
}
