
export type CentreOccupant={tenant_id:string;person_key?:string;person_type:string;in_building:boolean;last_event_at:string|null;last_gate_id:string|null};
export type CentreAccessEvent={id:string;tenant_id:string;gate_id:string;direction:string;decision:string;occurred_at:string};
export type CentreVisitor={id:string;tenant_id:string;full_name:string;pass_number:string;purpose:string|null;status:string;checked_in_at:string|null;checked_out_at:string|null;created_at:string};
export type CentreCamera={id:string;tenant_id:string;camera_code:string;display_name:string;status:string;last_health_at:string|null};
export type CentreDevice={id:string;tenant_id:string;device_code:string;device_type:string;status:string;last_health_at:string|null};
export type MusterEvent={id:string;tenant_id:string;status:string;started_at:string;ended_at:string|null};
export type MusterRow={id:string;tenant_id:string;muster_event_id:string;person_key?:string;person_type:string;expected_inside:boolean;status:string;muster_point:string|null};

export const PHYSICAL_SECURITY_ENABLED=import.meta.env.VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED==='true';
export const VISITOR_WRITES_ENABLED=PHYSICAL_SECURITY_ENABLED && import.meta.env.VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED==='true';

/** A superadmin's global role alone is NOT a centre assignment. Require an explicit centre director/security membership. */
export function physicalSecurityScope(user:{id:string;tenantId?:string;role:string;roles?:readonly string[]}|null|undefined):string|null{
 if(!user?.id||!user.tenantId||!Array.isArray(user.roles)||!user.roles.includes(user.role))return null;
 return user.role==='security_officer'||user.role==='centre_director'?user.tenantId:null;
}
export function visitorWriter(user:{id:string;tenantId?:string;role:string;roles?:readonly string[]}|null|undefined):boolean{
 return !!physicalSecurityScope(user)&&user?.role==='security_officer'&&VISITOR_WRITES_ENABLED;
}
export function requireCentreRows<T extends {tenant_id:string}>(rows:readonly T[],centre:string):T[]{
 if(!Array.isArray(rows)||rows.some(row=>!row||row.tenant_id!==centre))throw Error('Unverified centre response');
 return [...rows];
}
export function occupancyStats(rows:readonly CentreOccupant[]){
 const inside=rows.filter(r=>r.in_building===true);
 return {inside:inside.length,visitors:inside.filter(r=>r.person_type==='visitor').length,learnersAndStaff:inside.filter(r=>r.person_type!=='visitor').length};
}
export function visitorStats(rows:readonly CentreVisitor[]){
 return {inside:rows.filter(v=>v.status==='in_building').length,
  preRegistered:rows.filter(v=>v.status==='pre_registered').length,
  checkedOut:rows.filter(v=>v.status==='checked_out').length};
}
/** Provider reports can become stale: never treat an old 'online' state as an active video feed. */
export function deviceHealth(status:string,lastCheck:string|null,now=Date.now()):'reported-online'|'stale'|'offline'{
 if(status!=='online')return 'offline';
 const ts=lastCheck?Date.parse(lastCheck):NaN;
 if(!Number.isFinite(ts)||ts>now+60_000||now-ts>5*60_000)return 'stale';
 return 'reported-online';
}
export function validateVisitorReceipt(data:unknown,tenant:string,status:'in_building'|'checked_out',id?:string):{id:string;tenant_id:string;status:string;pass_number:string}{
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Visitor acknowledgement was not verified');
 const row=data as Record<string,unknown>;
 if(row.tenant_id!==tenant||row.status!==status||typeof row.id!=='string'||!row.id||
   typeof row.pass_number!=='string'||!row.pass_number||(id&&row.id!==id))throw Error('Visitor acknowledgement did not match the centre and action');
 return row as {id:string;tenant_id:string;status:string;pass_number:string};
}
export const displayTime=(date:string|null)=>date&&Number.isFinite(Date.parse(date))?new Date(date).toLocaleString('en-PK',{timeZone:'Asia/Karachi'}):'Not recorded';
