import {validateInspectionDraft,validCalendarDate,type InspectionDraft} from './facilitiesPlanning';
import type {FacilityRegister} from './facilitiesRegister';
import {physicalSecurityScope} from './physicalSecurity';

export const FACILITIES_WRITE_ENABLED=import.meta.env.VITE_UNIPATHWAY_FACILITIES_WRITES_ENABLED==='true';
export type InspectionOutcome='satisfactory'|'defect'|'not_verified';
export const inspectionOutcomes:readonly InspectionOutcome[]=['satisfactory','defect','not_verified'];
export type InspectionEntry={assetId:string;date:string;outcome:InspectionOutcome;notes:string;nextDue:string};
export type FacilitiesPayload={category:string;asset_code:string;location:string;planned_inspection_date:string}|{asset_id:string;inspected_on:string;outcome:InspectionOutcome;notes:string;next_due_date:string|null};
export type FacilitiesCommand={requestId:string;kind:'asset'|'inspection';payload:FacilitiesPayload};
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const date=(value:string)=>!value.startsWith('0000-')&&validCalendarDate(value);
export function facilitiesWriterScope(user:Parameters<typeof physicalSecurityScope>[0]){
 return user?.role==='centre_director'?physicalSecurityScope(user):null;
}
export function assetCommandPayload(draft:InspectionDraft,snapshot:FacilityRegister):FacilitiesPayload{
 const item=validateInspectionDraft(draft);
 if(!date(item.dueDate))throw Error('Enter a valid planning date.');
 if(snapshot.assets.length>=500)throw Error('Register capacity reached. Request a reviewed historical reporting solution.');
 if(snapshot.assets.some(a=>a.asset_code.toLowerCase()===item.assetCode.toLowerCase()))throw Error('That asset reference already exists in this centre.');
 return {category:item.category,asset_code:item.assetCode,location:item.location,planned_inspection_date:item.dueDate};
}
export function inspectionCommandPayload(draft:InspectionEntry,snapshot:FacilityRegister,today:string):FacilitiesPayload{
 const notes=draft.notes.trim();
 if(!uuid(draft.assetId)||!snapshot.assets.some(a=>a.id===draft.assetId))throw Error('Choose an asset from the verified centre register.');
 if(snapshot.inspections.length>=1000)throw Error('Inspection register capacity reached. Request a reviewed historical reporting solution.');
 if(!inspectionOutcomes.includes(draft.outcome)||!notes||notes.length>2000)throw Error('Choose an outcome and enter factual inspection notes.');
 if(!date(today)||!date(draft.date)||draft.date>today||(draft.nextDue&&(!date(draft.nextDue)||draft.nextDue<draft.date)))throw Error('Inspection date must be today or earlier; the next due date cannot precede it.');
 return {asset_id:draft.assetId,inspected_on:draft.date,outcome:draft.outcome,notes,next_due_date:draft.nextDue||null};
}
export function verifyFacilitiesCommandReceipt(raw:unknown,tenant:string,command:FacilitiesCommand){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Facilities acknowledgement unavailable');
 const row=raw as Record<string,unknown>;
 if(!uuid(row.id)||row.tenant_id!==tenant||row.kind!==command.kind||row.request_id!==command.requestId)throw Error('Facilities acknowledgement does not match the request');
 return row.id;
}
