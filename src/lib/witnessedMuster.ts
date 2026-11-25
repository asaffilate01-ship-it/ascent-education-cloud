import {siteId} from '@/lib/siteOperations';
export type MusterKind='drill'|'reported_emergency';
export type WitnessedPerson={id:string;tenant_id:string;incident_id:string;label:string;person_type:string;status:'unaccounted'|'safe';revision:number;observed_at:string|null;point:string|null};
export type WitnessedIncident={id:string;tenant_id:string;event_type:MusterKind;incident_reference:string;started_by:string;started_at:string};
export type WitnessedClosure={id:string;tenant_id:string;event_type:MusterKind;incident_reference:string;started_at:string;closed_at:string;unresolved_at_close:number;closure_note:string};
export type WitnessedAudit={id:string;tenant_id:string;incident_id:string;person_id:string|null;action:'started'|'confirmed_safe'|'corrected_unaccounted'|'closed';actor_id:string;note:string;recorded_at:string};
export type WitnessedMuster={incident:WitnessedIncident|null;people:WitnessedPerson[];history:WitnessedClosure[];audit:WitnessedAudit[];manager:boolean;officer:boolean;writes_enabled:boolean};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const label=(v:unknown,max=500):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const timestamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const integer=(v:unknown,max=2147483647):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=max;
const kind=(v:unknown)=>v==='drill'||v==='reported_emergency';
export function readWitnessedMuster(raw:unknown,tenant:string):WitnessedMuster{
 if(!obj(raw)||raw.tenant_id!==tenant||typeof raw.manager!=='boolean'||typeof raw.officer!=='boolean'||typeof raw.writes_enabled!=='boolean'||!Array.isArray(raw.people)||raw.people.length>500||!Array.isArray(raw.history)||raw.history.length>10||!Array.isArray(raw.audit)||raw.audit.length>100)throw Error('Invalid muster response');
 const incident=raw.incident;
 if(incident!==null&&(!obj(incident)||!siteId(incident.id)||incident.tenant_id!==tenant||!kind(incident.event_type)||!label(incident.incident_reference,200)||!siteId(incident.started_by)||!timestamp(incident.started_at)))throw Error('Invalid incident');
 if(incident===null&&raw.people.length)throw Error('Unbound roll-call');
 const event=incident as WitnessedIncident|null;
 const people=new Set<string>(),history=new Set<string>(),audit=new Set<string>();
 for(const p of raw.people){
  if(!obj(p)||!siteId(p.id)||people.has(p.id)||p.tenant_id!==tenant||p.incident_id!==event?.id||!label(p.label,300)||!['student','staff','contractor','visitor','other'].includes(String(p.person_type))||!['safe','unaccounted'].includes(String(p.status))||!integer(p.revision)||(p.status==='safe'&&(!label(p.point,160)||p.revision===0))||(p.status==='unaccounted'&&p.point!==null)||(p.revision===0?p.observed_at!==null:!timestamp(p.observed_at)))throw Error('Invalid roll-call record');people.add(p.id);
 }
 for(const h of raw.history){if(!obj(h)||!siteId(h.id)||history.has(h.id)||h.id===event?.id||h.tenant_id!==tenant||!kind(h.event_type)||!label(h.incident_reference,200)||!timestamp(h.started_at)||!timestamp(h.closed_at)||Date.parse(h.closed_at)<Date.parse(h.started_at)||!integer(h.unresolved_at_close,500)||!label(h.closure_note))throw Error('Invalid closure history');history.add(h.id);}
 for(const a of raw.audit){if(!obj(a)||!siteId(a.id)||audit.has(a.id)||a.tenant_id!==tenant||!siteId(a.incident_id)||!siteId(a.actor_id)||!['started','confirmed_safe','corrected_unaccounted','closed'].includes(String(a.action))||(['started','closed'].includes(String(a.action))?a.person_id!==null:!siteId(a.person_id))||!label(a.note)||!timestamp(a.recorded_at))throw Error('Invalid audit row');audit.add(a.id);}
 return {incident:event,people:raw.people as WitnessedPerson[],history:raw.history as WitnessedClosure[],audit:raw.audit as WitnessedAudit[],manager:raw.manager,officer:raw.officer,writes_enabled:raw.writes_enabled};
}
export function witnessedCounts(people:readonly WitnessedPerson[]){const safe=people.filter(p=>p.status==='safe').length;return {expected:people.length,safe,unresolved:people.length-safe};}
