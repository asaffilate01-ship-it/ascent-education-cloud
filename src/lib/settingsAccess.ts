import type {UserRole} from '@/types/platform';
import {integrationCurrent,verifyReadinessSnapshot} from '@/lib/readiness';
import {parseZonedAcademicTimestamp} from '@/lib/academicTime';

type Actor={id?:string;tenantId?:string|null;role?:UserRole;roles?:readonly UserRole[]}|null|undefined;
export function settingsCapabilities(user:Actor){
 const role=user?.id&&user.role&&user.roles?.includes(user.role)?user.role:null;
 const owner=role==='superadmin',director=role==='centre_director';
 const leadership=owner||director;
 const centre=!!user?.tenantId;
 return {role,owner,director,leadership,centre,integrations:leadership&&centre,branding:leadership,users:leadership&&centre,data:leadership||role==='finance_officer',readinessPath:owner?'/landlord/readiness':director?'/director/readiness':null,brandingPath:owner?'/landlord/centres':director&&centre?'/director/branding':null,studentPath:leadership&&centre?'/director/students':null,financePath:centre&&(leadership||role==='finance_officer')?'/finance':null,auditPath:leadership&&centre?'/audit':null};
}
const providerNames:Record<string,string>={
 microsoft_education:'Microsoft Teams Education',microsoft_entra_graph:'Microsoft Entra / Graph',
 institutional_payments:'Institutional payments',payment_gateway:'Payment gateway',
 institutional_email:'Institutional email',sms_whatsapp:'SMS / WhatsApp',
 virtual_lab_provider:'Virtual lab provider',cctv_vms:'CCTV video management',
 omniqora_central_factory:'Omniqora AI services',physical_access_control:'Physical access control',
};
const statuses:Record<string,string>={not_configured:'Not configured',credentials_required:'Credentials required',configured:'Configured — health unverified',testing:'Testing',healthy:'Verification expired or invalid',degraded:'Reported degraded',failed:'Reported failure',not_applicable:'Recorded not applicable'};
export function settingsIntegrationEvidence(raw:unknown,tenant:string,now:number){
 const rows=verifyReadinessSnapshot(raw,[],tenant).integrations;
 return rows.map(row=>{
  const current=integrationCurrent(row,now);
  const stamp=parseZonedAcademicTimestamp(row.last_health_at);
  return {id:row.id,key:row.integration_key,name:providerNames[row.integration_key]||row.integration_key.replace(/_/g,' '),status:current?'Health verified within 24 hours':statuses[row.status]||'Unrecognised status — review required',current,required:row.required_for_launch,checkedAt:stamp!==null&&stamp<=now?new Date(stamp).toISOString():null};
 }).sort((a,b)=>Number(b.required)-Number(a.required)||a.name.localeCompare(b.name));
}
