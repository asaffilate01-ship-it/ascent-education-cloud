/** RLS remains authoritative for camera access. Never combine a camera
 * membership in one centre with a leadership or security role in another.
 */
export function cctvViewingAllowed(rows:unknown,userId:string,tenantId:string,mode:'live'|'playback',camera:{security_live:boolean;security_playback:boolean}):boolean{
 if(!userId||!tenantId||!Array.isArray(rows))return false;
 const valid=rows.filter((row):row is {user_id:string;tenant_id:string|null;role:string}=>Boolean(row&&typeof row==='object'&&row.user_id===userId&&typeof row.role==='string'));
 const manager=valid.some(row=>(row.role==='superadmin'&&row.tenant_id===null)||(row.role==='centre_director'&&row.tenant_id===tenantId));
 const security=valid.some(row=>row.role==='security_officer'&&row.tenant_id===tenantId);
 return manager||(security&&(mode==='live'?camera.security_live===true:camera.security_playback===true));
}
