import {validCalendarDate} from './facilitiesPlanning';
import type {FacilityRegister} from './facilitiesRegister';

export const FACILITIES_FOLLOWUPS_ENABLED=import.meta.env.VITE_UNIPATHWAY_FACILITIES_FOLLOWUPS_ENABLED==='true';
export const followupTeams=['facilities','centre_management','security','maintenance_contractor'] as const;
export type FollowupTeam=typeof followupTeams[number];
export type Followup={id:string;tenant_id:string;asset_id:string;inspection_id:string;task:string;team:FollowupTeam;target_date:string;created_at:string;resolution_evidence:string|null;resolved_at:string|null};
export type OpenFollowupDraft={inspectionId:string;task:string;team:FollowupTeam;targetDate:string};
type OpenPayload={asset_id:string;inspection_id:string;task:string;team:FollowupTeam;target_date:string};
type ResolvePayload={action_id:string;evidence:string};
export type FollowupCommand={requestId:string;kind:'open';payload:OpenPayload}|{requestId:string;kind:'resolve';payload:ResolvePayload};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const date=(value:unknown):value is string=>typeof value==='string'&&!value.startsWith('0000-')&&validCalendarDate(value);
const timestamp=(value:unknown):value is string=>typeof value==='string'&&/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)&&Number.isFinite(Date.parse(value));

export function verifyFollowups(raw:unknown,tenant:string,register:FacilityRegister):Followup[]{
 if(!Array.isArray(raw)||raw.length>500)throw Error('Unverified follow-up register');
 const ids=new Set<string>();
 return raw.map(value=>{
  if(!object(value)||value.tenant_id!==tenant||!uuid(value.id)||ids.has(value.id)||!uuid(value.asset_id)||!uuid(value.inspection_id)||!text(value.task,1000)||!followupTeams.includes(value.team as FollowupTeam)||!date(value.target_date)||!timestamp(value.created_at))throw Error('Unverified follow-up record');
  const inspection=register.inspections.find(i=>i.id===value.inspection_id&&i.asset_id===value.asset_id&&i.tenant_id===tenant);
  if(!inspection||!['defect','not_verified'].includes(inspection.outcome)||!register.assets.some(a=>a.id===value.asset_id&&a.tenant_id===tenant))throw Error('Follow-up inspection does not match this centre');
  if(value.resolved_at===null?value.resolution_evidence!==null:!timestamp(value.resolved_at)||!text(value.resolution_evidence,2000)||Date.parse(value.resolved_at)<Date.parse(value.created_at))throw Error('Unverified resolution evidence');
  ids.add(value.id);
  return value as unknown as Followup;
 }).sort((a,b)=>Number(!!a.resolved_at)-Number(!!b.resolved_at)||a.target_date.localeCompare(b.target_date)||a.id.localeCompare(b.id));
}

export function openFollowupPayload(draft:OpenFollowupDraft,register:FacilityRegister,rows:readonly Followup[],today:string):OpenPayload{
 const inspection=register.inspections.find(i=>i.id===draft.inspectionId&&['defect','not_verified'].includes(i.outcome));
 const task=draft.task.trim();
 if(!inspection||!uuid(inspection.id)||!uuid(inspection.asset_id)||!register.assets.some(a=>a.id===inspection.asset_id&&a.tenant_id===inspection.tenant_id))throw Error('Choose a verified defect or unverified inspection.');
 if(rows.length>=500)throw Error('Follow-up capacity reached. Request a reviewed reporting solution.');
 if(rows.some(row=>row.inspection_id===inspection.id&&!row.resolved_at))throw Error('This inspection already has an open follow-up.');
 if(!text(task,1000)||!followupTeams.includes(draft.team)||!date(draft.targetDate)||!date(today)||draft.targetDate<today)throw Error('Enter a task, responsible team and target date of today or later.');
 return {asset_id:inspection.asset_id,inspection_id:inspection.id,task,team:draft.team,target_date:draft.targetDate};
}
export function resolveFollowupPayload(actionId:string,evidence:string,rows:readonly Followup[]):ResolvePayload{
 const notes=evidence.trim();
 if(!uuid(actionId)||!rows.some(row=>row.id===actionId&&!row.resolved_at)||!text(notes,2000))throw Error('Choose an open follow-up and enter factual resolution evidence.');
 return {action_id:actionId,evidence:notes};
}
export function verifyFollowupReceipt(raw:unknown,tenant:string,command:FollowupCommand){
 const action=command.kind==='open'?command.requestId:command.payload.action_id;
 if(!object(raw)||raw.tenant_id!==tenant||raw.request_id!==command.requestId||raw.kind!==command.kind||raw.action_id!==action)throw Error('Unverified follow-up acknowledgement');
 return action;
}
