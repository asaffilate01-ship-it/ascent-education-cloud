/** Client-side defence-in-depth for the selected UniPathway role and centre.
 * The database's per-session invitation check and RLS remain authoritative.
 */
type ClassroomPrincipal={
 id?:string|null;
 tenantId?:string|null;
 role?:string|null;
 roles?:readonly string[]|null;
}|null|undefined;
const allowed=new Set(['student','lecturer','programme_leader','centre_director','superadmin']);
const teachers=new Set(['lecturer','programme_leader','centre_director','superadmin']);
const managers=new Set(['programme_leader','centre_director','superadmin']);
export function activeClassroomCentre(user:ClassroomPrincipal):string|null{
 if(!user?.id||!user.tenantId||!user.role||!user.roles?.includes(user.role)||!allowed.has(user.role))return null;
 return user.tenantId;
}
export function activeClassroomTeacher(user:ClassroomPrincipal):boolean{
 return !!activeClassroomCentre(user)&&teachers.has(user!.role!);
}
export function activeWhiteboardManager(user:ClassroomPrincipal):boolean{
 return !!activeClassroomCentre(user)&&managers.has(user!.role!);
}
export function mayEditWhiteboard(user:ClassroomPrincipal,board:{
 tenant_id:string;prepared_by:string|null;locked_after_class:boolean;
}|null):boolean{
 return !!board&&!board.locked_after_class&&!!activeClassroomTeacher(user)&&
  board.tenant_id===activeClassroomCentre(user)&&
  (activeWhiteboardManager(user)||board.prepared_by===user?.id);
}
export function verifyClassroomRows<T extends {tenant_id:string}>(rows:unknown,tenant:string):T[]{
 if(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||row.tenant_id!==tenant)){
  throw Error('Unverified classroom centre result');
 }
 return rows as T[];
}
