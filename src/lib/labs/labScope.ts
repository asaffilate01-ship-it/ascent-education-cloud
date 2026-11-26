import type {UserRole} from '@/types/platform';

export type LabScope={id:string;tenantId:string;role:UserRole};
export type LabAccount={id?:string;tenantId?:string;role:UserRole;roles?:readonly UserRole[]};
export type LabKind='tech'|'language';
const allowed:readonly UserRole[]=['student','lecturer','programme_leader','assessor','centre_director','superadmin'];
const validId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&v.trim()===v;
export function verifiedLabScope(user:LabAccount|null|undefined):LabScope|null{
 if(!user||!validId(user.id)||!validId(user.tenantId)||!Array.isArray(user.roles)||!user.roles.includes(user.role)||!allowed.includes(user.role))return null;
 return {id:user.id,tenantId:user.tenantId,role:user.role};
}
export function labPrincipalKey(scope:LabScope){return JSON.stringify([scope.id,scope.tenantId,scope.role]);}
export function labSessionStorageKey(kind:LabKind,scope:LabScope){return 'unipathway-live-lab-v2:'+kind+':'+encodeURIComponent(labPrincipalKey(scope));}
const sessionPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validLabSessionId(value:unknown):value is string{return typeof value==='string'&&sessionPattern.test(value);}
type SessionStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function readScopedLabSession(storage:SessionStorage|null,kind:LabKind,scope:LabScope):string|null{
 try{
  storage?.removeItem('unipathway-live-lab-'+kind);
  const stored=storage?.getItem(labSessionStorageKey(kind,scope));
  return validLabSessionId(stored)?stored:null;
 }catch{return null;}
}
export function writeScopedLabSession(storage:SessionStorage|null,kind:LabKind,scope:LabScope,id:string|null){
 try{
  const key=labSessionStorageKey(kind,scope);
  if(validLabSessionId(id))storage?.setItem(key,id);else storage?.removeItem(key);
 }catch{/* Browser storage may be disabled. In-memory use still works. */}
}
export function labSessionMatches(row:unknown,scope:LabScope,kind:LabKind,id:string){
 if(!row||typeof row!=='object'||Array.isArray(row))return false;
 const v=row as Record<string,unknown>;
 return validLabSessionId(id)&&v.id===id&&v.tenant_id===scope.tenantId&&v.kind===kind&&['live','ended'].includes(String(v.status));
}
export function labAttemptMatches(row:unknown,scope:Pick<LabScope,'id'|'tenantId'>,kind:LabKind){
 if(!row||typeof row!=='object'||Array.isArray(row))return false;
 const v=row as Record<string,unknown>;
 return v.user_id===scope.id&&v.tenant_id===scope.tenantId&&v.lab_kind===kind;
}
