export const SITE_OPERATIONS_ENABLED=import.meta.env.VITE_UNIPATHWAY_SITE_OPERATIONS_ENABLED==='true';
export const ASSET_TYPES=['entrance','fire_exit','fire_extinguisher','alarm_call_point','fire_panel','assembly_point','emergency_light','fire_door','first_aid'] as const;
export type AssetType=typeof ASSET_TYPES[number];
export const CONDITIONS=['not_checked','observed_ok','attention_required','out_of_service'] as const;
export type AssetCondition=typeof CONDITIONS[number];
export const ASSET_LABELS:Record<AssetType,string>={entrance:'Entrance',fire_exit:'Fire exit',fire_extinguisher:'Fire extinguisher',alarm_call_point:'Alarm call point',fire_panel:'Fire alarm panel',assembly_point:'Assembly point',emergency_light:'Emergency light',fire_door:'Fire door',first_aid:'First aid station'};
export type SafetyAsset={id:string;tenant_id:string;asset_id:string;asset_code:string;asset_type:AssetType;floor_label:string;location_label:string;plan_reference:string;x:number|null;y:number|null;condition:AssetCondition;next_review:string|null;note:string;recorded_by:string;recorded_at:string};
export type AccessCard={id:string;tenant_id:string;holder_user_id:string;name:string;holder_type:'student'|'staff'|'contractor';valid_from:string;valid_until:string|null;status:string};
export type SitePerson={id:string;name:string;kind:'student'|'staff'};
export type GateAudit={id:string;tenant_id:string;location:string;action:'in'|'out';outcome:'allowed'|'denied'|'manual_override';actor_id:string|null;event_at:string;subject_name:string|null;subject_kind:string};
export type VisitSignature={tenant_id:string;visitor_id:string;kind:'visitor'|'guest';host_reference:string;typed_name:string;notice_version:string;attested_by:string;signed_at:string;pass_number:string;status:string};
export type CCTVLog={id:string;tenant_id:string;camera_id:string;camera_name:string;user_id:string;mode:'live'|'playback';created_at:string};
export type CardChange={id:string;tenant_id:string;credential_id:string;action:'registered'|'revoked';actor_id:string;note:string;created_at:string};
export type SiteKind='facilities'|'cards'|'audit'|'visitor_signatures'|'cctv_audit'|'facility_history'|'card_audit';
type Rows={facility_history:SafetyAsset;card_audit:CardChange;facilities:SafetyAsset;cards:AccessCard;audit:GateAudit;visitor_signatures:VisitSignature;cctv_audit:CCTVLog};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const siteId=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const str=(v:unknown,max=500):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const timestamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const coordinate=(v:unknown):v is number|null=>v===null||typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=100;
export function siteDate(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=Date.parse(v+'T00:00:00Z');return Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===v;}
export function readSite<K extends SiteKind>(raw:unknown,tenant:string,kind:K){
 if(!obj(raw)||raw.tenant_id!==tenant||raw.kind!==kind||typeof raw.manager!=='boolean'||typeof raw.officer!=='boolean'||typeof raw.writes_enabled!=='boolean'||!Array.isArray(raw.rows)||raw.rows.length>500||!Array.isArray(raw.roster)||raw.roster.length>500)throw Error('Unverified site response');
 const ids=new Set<string>(),people=new Set<string>();
 for(const p of raw.roster){if(!obj(p)||!siteId(p.id)||people.has(p.id)||!str(p.name,300)||(p.kind!=='student'&&p.kind!=='staff')||kind!=='cards'||!raw.manager)throw Error('Unverified roster');people.add(p.id);}
 for(const r of raw.rows){
  if(!obj(r)||r.tenant_id!==tenant)throw Error('Foreign site record');
  const identity=kind==='visitor_signatures'?r.visitor_id:kind==='facilities'?r.asset_id:r.id;
  if(!siteId(identity)||ids.has(identity))throw Error('Duplicate or invalid site identity');ids.add(identity);
  if((kind==='facilities'||kind==='facility_history')&&(!siteId(r.asset_id)||!siteId(r.id)||!str(r.asset_code,80)||!ASSET_TYPES.includes(r.asset_type as AssetType)||!str(r.floor_label,100)||!str(r.location_label,200)||!str(r.plan_reference,200)||!coordinate(r.x)||!coordinate(r.y)||(r.x===null)!==(r.y===null)||!CONDITIONS.includes(r.condition as AssetCondition)||(r.next_review!==null&&!siteDate(r.next_review))||!str(r.note)||!siteId(r.recorded_by)||!timestamp(r.recorded_at)))throw Error('Invalid facility record');
  if(kind==='cards'&&(!siteId(r.holder_user_id)||!str(r.name,300)||!['student','staff','contractor'].includes(String(r.holder_type))||!timestamp(r.valid_from)||(r.valid_until!==null&&!timestamp(r.valid_until))||!['active','suspended','revoked','expired','eligibility_review'].includes(String(r.status))))throw Error('Invalid access card');
  if(kind==='audit'&&(!str(r.location,80)||!['in','out'].includes(String(r.action))||!['allowed','denied','manual_override'].includes(String(r.outcome))||(r.actor_id!==null&&!siteId(r.actor_id))||!timestamp(r.event_at)||(r.subject_name!==null&&!str(r.subject_name,300))||!['student','staff','contractor','visitor','unmatched'].includes(String(r.subject_kind))))throw Error('Invalid gate audit');
  if(kind==='visitor_signatures'&&(!['visitor','guest'].includes(String(r.kind))||!str(r.host_reference,120)||!str(r.typed_name,120)||!str(r.notice_version,80)||!siteId(r.attested_by)||!timestamp(r.signed_at)||!str(r.pass_number,100)||!['in_building','checked_out','denied','pre_registered'].includes(String(r.status))))throw Error('Invalid visitor acknowledgement');
  if(kind==='card_audit'&&(!siteId(r.credential_id)||!['registered','revoked'].includes(String(r.action))||!siteId(r.actor_id)||!str(r.note)||!timestamp(r.created_at)))throw Error('Invalid card change audit');
  if(kind==='cctv_audit'&&(!siteId(r.camera_id)||!str(r.camera_name,100)||!siteId(r.user_id)||!['live','playback'].includes(String(r.mode))||!timestamp(r.created_at)))throw Error('Invalid CCTV audit');
 }
 return {rows:raw.rows as Rows[K][],roster:raw.roster as SitePerson[],manager:raw.manager,officer:raw.officer,writes_enabled:raw.writes_enabled};
}
export function siteReceipt(raw:unknown,tenant:string,expected:Record<string,unknown>){
 if(!obj(raw)||raw.tenant_id!==tenant||!siteId(raw.id)||Object.entries(expected).some(([k,v])=>raw[k]!==v))throw Error('Unverified site action receipt');
 return raw;
}
export function siteRole(user:{id:string;tenantId?:string|null;role:string;roles?:readonly string[]}|null|undefined){
 return user?.id&&user.tenantId&&user.roles?.includes(user.role)&&['security_officer','centre_director','superadmin'].includes(user.role)?user.tenantId:null;
}
