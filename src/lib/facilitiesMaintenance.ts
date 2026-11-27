import {validCalendarDate} from './facilitiesPlanning';
import type {FacilityAsset,FacilityInspection,FacilityRegister} from './facilitiesRegister';

export type MaintenanceTiming='overdue'|'due_today'|'next_seven_days'|'later'|'unscheduled';
export type MaintenanceRow={asset:FacilityAsset;latest:FacilityInspection|null;dueDate:string|null;timing:MaintenanceTiming;needsEvidence:boolean;recordedDefect:boolean};
export function maintenanceTiming(date:string|null,today:string):MaintenanceTiming{
 if(!date||!validCalendarDate(date)||!validCalendarDate(today))return 'unscheduled';
 if(date<today)return 'overdue';
 if(date===today)return 'due_today';
 const days=(Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 return days<=7?'next_seven_days':'later';
}
/** Latest by inspection date, then recording time and deterministic ID. Never infer safety from a record. */
export function facilitiesMaintenanceRows(snapshot:FacilityRegister,today:string):MaintenanceRow[]{
 const latestByAsset=new Map<string,FacilityInspection>();
 for(const item of [...snapshot.inspections].sort((a,b)=>b.inspected_on.localeCompare(a.inspected_on)||Date.parse(b.recorded_at)-Date.parse(a.recorded_at)||a.id.localeCompare(b.id))){
  if(!latestByAsset.has(item.asset_id))latestByAsset.set(item.asset_id,item);
 }
 const order:Record<MaintenanceTiming,number>={overdue:0,due_today:1,next_seven_days:2,unscheduled:3,later:4};
 return snapshot.assets.map(asset=>{
  const latest=latestByAsset.get(asset.id)??null;
  // A completed inspection without an explicit next due date needs scheduling,
  // not silent reuse of the original planned inspection date.
  const dueDate=latest?latest.next_due_date:asset.planned_inspection_date;
  return {asset,latest,dueDate,timing:maintenanceTiming(dueDate,today),needsEvidence:!latest||latest.outcome==='not_verified',recordedDefect:latest?.outcome==='defect'};
 }).sort((a,b)=>Number(b.recordedDefect)-Number(a.recordedDefect)||order[a.timing]-order[b.timing]||Number(b.needsEvidence)-Number(a.needsEvidence)||(a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')||a.asset.asset_code.localeCompare(b.asset.asset_code));
}
export function maintenanceCounts(rows:readonly MaintenanceRow[]){
 return {defects:rows.filter(r=>r.recordedDefect).length,due:rows.filter(r=>r.timing==='overdue'||r.timing==='due_today').length,soon:rows.filter(r=>r.timing==='next_seven_days').length,unscheduled:rows.filter(r=>r.timing==='unscheduled').length,unverified:rows.filter(r=>r.needsEvidence).length};
}
