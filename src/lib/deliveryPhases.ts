import {baselineChecks,integrationCurrent,readinessCheckCurrent,type ReadinessCheck,type ReadinessIntegration} from '@/lib/readiness';

export const deliveryPhases=[
 {id:'P0',title:'Production security and recovery',checks:['full_migration_replay','tenant_role_isolation','backup_restore_drill','institutional_email_e2e'],providers:[],separate:'Verify real-account MFA, session revocation, RLS, deployment and recovery with authorised production access.'},
 {id:'P1',title:'Academic assessment and learner lifecycle',checks:['student_lifecycle_e2e','assessment_annotation_and_history','guardian_child_isolation'],providers:[],separate:'Test complete admissions, independent marking, learner access and examinations with real authorised accounts.'},
 {id:'P2',title:'Quality assurance and qualification compliance',checks:['course_materials_approved','centre_and_qualification_approvals','partner_agreement_verification'],providers:[],separate:'Confirm awarding-body permissions, approved courses and independent IQA/EQA evidence.'},
 {id:'P3',title:'Microsoft Teams Education',checks:['teams_classroom_smoke_test'],providers:['microsoft_education'],separate:'Confirm tenant consent, licences, invitation delivery, recordings and classroom acceptance.'},
 {id:'P4',title:'Technology and language laboratories',checks:['language_room_audio_e2e','cloud_lab_lifecycle_e2e','scorm_lti_content_e2e'],providers:[],separate:'Verify browser exercises, cloud provisioning, limits, shutdown and teacher-led class trials.'},
 {id:'P5',title:'Payroll and financial operations',checks:['live_payment_reconciliation','sponsor_liability_reconciliation'],providers:['institutional_payments'],separate:'Student payment and sponsor evidence does not establish payroll readiness. Verify staff contracts, applicable deductions, payslips and salary settlement separately.'},
 {id:'P6',title:'Security, access control and CCTV',checks:['nadra_approved_connection','cctv_security_playback'],providers:[],separate:'Verify approved identity connection, real camera playback, access cards, visitor entry/exit and scoped viewing. No hardware connection is implied.'},
 {id:'P7',title:'Facilities and fire safety',checks:[],providers:[],separate:'No dedicated facilities baseline exists in this launch register. Require separately verified physical inspections, exit plans, alarms, extinguishers and maintenance records.'},
 {id:'P8',title:'Administrative AI and agent integrations',checks:['omniqora_ai_e2e'],providers:[],separate:'Verify approved provider credentials, model and tenant binding, budgets, audited tool permissions and human approvals. Do not expose the hidden Study Tutor.'},
 {id:'P9',title:'Release quality and responsive experience',checks:['publication_release_verified','offline_restart_and_sync','public_contact_and_course_information','desktop_mobile_task_flows'],providers:[],separate:'Verify the published main release and mobile, tablet, desktop and accessibility journeys.'}
] as const;
export function deliveryPhaseEvidence(checks:readonly ReadinessCheck[],integrations:readonly ReadinessIntegration[],now:number){
 const byCheck=new Map(checks.map(c=>[c.check_key,c]));
 const byProvider=new Map(integrations.map(i=>[i.integration_key,i]));
 return deliveryPhases.map(phase=>{
  const gates=[...phase.checks.map(key=>{
   const record=byCheck.get(key);
   return {key,kind:'check' as const,recordId:record?.id,state:!record?'missing' as const:readinessCheckCurrent(record,now)?'current' as const:'outstanding' as const};
  }),...phase.providers.map(key=>{
   const record=byProvider.get(key);
   return {key,kind:'provider' as const,recordId:record?.id,state:!record?'missing' as const:integrationCurrent(record,now)?'current' as const:'outstanding' as const};
  })];
  return {...phase,gates,current:gates.filter(g=>g.state==='current').length,unverified:gates.filter(g=>g.state!=='current').length};
 });
}
export function unmappedBaselineChecks(){
 const assigned=new Set<string>(deliveryPhases.flatMap(p=>[...p.checks]));
 return baselineChecks.filter(key=>!assigned.has(key));
}
