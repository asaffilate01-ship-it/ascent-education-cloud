/** Exact explicit centre and role; no reliance on user-editable claims or role labels alone. */
export const cameraIdValid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export type CameraRole='superadmin'|'centre_director'|'security_officer';
export function cameraScope(userId:string,tenant:string,role:unknown,profile:unknown,roles:unknown,centre:unknown):role is CameraRole{
 if(!cameraIdValid(userId)||!cameraIdValid(tenant)||!profile||typeof profile!=='object'||!centre||typeof centre!=='object'||!Array.isArray(roles))return false;
 const p=profile as Record<string,unknown>,t=centre as Record<string,unknown>;
 if(p.user_id!==userId||t.id!==tenant||t.status!=='active')return false;
 if(role==='superadmin')return roles.some(r=>r?.user_id===userId&&r.role==='superadmin'&&r.tenant_id===null);
 if(role!=='security_officer'&&role!=='centre_director'||p.tenant_id!==tenant)return false;
 return roles.some(r=>r?.user_id===userId&&r.role===role&&r.tenant_id===tenant);
}
export function canViewCamera(camera:unknown,tenant:string,cameraId:string,role:CameraRole,mode:'live'|'playback'){
 if(!camera||typeof camera!=='object')return false;
 const c=camera as Record<string,unknown>;
 return c.id===cameraId&&c.tenant_id===tenant&&c.enabled===true&&typeof c.provider_camera_id==='string'&&c.provider_camera_id.length>0&&c.provider_camera_id.length<=200&&(role!=='security_officer'||(mode==='live'?c.security_live===true:c.security_playback===true));
}
