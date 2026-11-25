import {facilitiesCategories,validCalendarDate,type FacilitiesCategory} from './facilitiesPlanning';

export type FacilityAsset={id:string;tenant_id:string;category:FacilitiesCategory;asset_code:string;location:string;planned_inspection_date:string};
export type FacilityInspection={id:string;tenant_id:string;asset_id:string;inspected_on:string;outcome:'satisfactory'|'defect'|'not_verified';notes:string;next_due_date:string|null;recorded_at:string};
export type FacilityRegister={assets:FacilityAsset[];inspections:FacilityInspection[]};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
export function verifyFacilitiesRegister(raw:unknown,tenant:string):FacilityRegister{
 if(!object(raw)||!Array.isArray(raw.assets)||!Array.isArray(raw.inspections)||raw.assets.length>500||raw.inspections.length>1000)throw Error('Unverified facilities snapshot');
 const assets=raw.assets;
 const inspections=raw.inspections;
 if(assets.some(a=>!object(a)||a.tenant_id!==tenant||!nonempty(a.id)||!nonempty(a.asset_code)||!nonempty(a.location)||!facilitiesCategories.includes(a.category as FacilitiesCategory)||typeof a.planned_inspection_date!=='string'||!validCalendarDate(a.planned_inspection_date)))throw Error('Unverified equipment record');
 const assetIds=new Set(assets.map(a=>a.id));
 if(assetIds.size!==assets.length)throw Error('Duplicate equipment records');
 if(inspections.some(i=>!object(i)||i.tenant_id!==tenant||!nonempty(i.id)||!assetIds.has(i.asset_id)||typeof i.inspected_on!=='string'||!validCalendarDate(i.inspected_on)||!['satisfactory','defect','not_verified'].includes(String(i.outcome))||!nonempty(i.notes)||!(i.next_due_date===null||(typeof i.next_due_date==='string'&&validCalendarDate(i.next_due_date)&&i.next_due_date>=i.inspected_on))||typeof i.recorded_at!=='string'||!Number.isFinite(Date.parse(i.recorded_at))))throw Error('Unverified inspection record');
 if(new Set(inspections.map(i=>i.id)).size!==inspections.length)throw Error('Duplicate inspection records');
 return {assets:assets as FacilityAsset[],inspections:inspections as FacilityInspection[]};
}
