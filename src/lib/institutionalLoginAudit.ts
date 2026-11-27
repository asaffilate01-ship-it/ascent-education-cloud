import {institutionalEmail} from '@/lib/institutionalAuth';
export const LOGIN_AUDIT_DAYS=[7,30,90] as const;
export type AuditDays=typeof LOGIN_AUDIT_DAYS[number];
export type LoginAuditEvent={id:string;centre_id:string;email_at_event:string;event_kind:'session_created'|'assurance_changed'|'network_changed';occurred_at:string;ip:string|null;aal:string|null};
export type LoginAuditSnapshot={centre_id:string;days:AuditDays;email_filter:string|null;reviewed_at:string;events:LoginAuditEvent[];truncated:boolean};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function loginAuditCentre(user:{id?:string;tenantId?:string;role?:string;roles?:readonly string[]}|null|undefined):string|null{
 return user?.id&&uuid(user.tenantId)&&user.role==='superadmin'&&user.roles?.includes('superadmin')?user.tenantId:null;
}
export function verifyLoginAudit(raw:unknown,centre:string,days:AuditDays,email:string|null):LoginAuditSnapshot{
 if(!object(raw)||raw.centre_id!==centre||raw.days!==days||raw.email_filter!==email||typeof raw.truncated!=='boolean'||typeof raw.reviewed_at!=='string'||!Array.isArray(raw.events)||raw.events.length>100)throw Error('Audit response scope could not be verified');
 const reviewed=Date.parse(raw.reviewed_at);
 if(!Number.isFinite(reviewed)||(raw.truncated&&raw.events.length!==100))throw Error('Invalid audit response');
 const ids=new Set<string>();
 let previous=reviewed;
 for(const row of raw.events){
  if(!object(row)||!uuid(row.id)||ids.has(row.id)||row.centre_id!==centre||typeof row.email_at_event!=='string'||institutionalEmail(row.email_at_event)!==row.email_at_event||(email&&row.email_at_event!==email)||!['session_created','assurance_changed','network_changed'].includes(String(row.event_kind))||typeof row.occurred_at!=='string'||!(row.ip===null||(typeof row.ip==='string'&&/^[0-9a-f:.]{2,45}$/i.test(row.ip)))||!(row.aal===null||['aal1','aal2','aal3'].includes(String(row.aal))))throw Error('Unverified audit record');
  const timestamp=Date.parse(row.occurred_at);
  if(!Number.isFinite(timestamp)||timestamp>previous||timestamp<reviewed-days*86400000)throw Error('Unverified audit time range');
  previous=timestamp;ids.add(row.id);
 }
 return raw as unknown as LoginAuditSnapshot;
}
