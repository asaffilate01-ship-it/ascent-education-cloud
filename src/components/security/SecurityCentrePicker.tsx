import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {siteId,SITE_OPERATIONS_ENABLED} from '@/lib/siteOperations';
/** Owners explicitly select a centre; ordinary staff cannot override their assigned centre. */
export function useSecurityPrincipal(){
 const {user,loading}=useAuth();
 const [params]=useSearchParams();
 const selected=params.get('centre');
 const owner=!!user?.id&&user.role==='superadmin'&&user.roles?.includes('superadmin');
 const tenant=owner&&SITE_OPERATIONS_ENABLED&&siteId(selected)?selected:user?.tenantId;
 return {user:user?{...user,tenantId:tenant}:user,loading,owner};
}
export function securityLink(path:string,tenant?:string,role?:string){
 return role==='superadmin'&&siteId(tenant)?path+'?centre='+encodeURIComponent(tenant):path;
}
export default function SecurityCentrePicker(){
 const {user,owner}=useSecurityPrincipal();const [,setParams]=useSearchParams();
 const [centres,setCentres]=useState<{id:string;name:string}[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setCentres([]);setError(false);if(!owner||!SITE_OPERATIONS_ENABLED){setLoading(false);return()=>{active=false;};}setLoading(true);
  void(async()=>{try{const r=await db.rpc('list_unipathway_security_centres');if(r.error||!Array.isArray(r.data)||r.data.length>500||r.data.some((c:any)=>!siteId(c?.id)||typeof c?.name!=='string'||!c.name.trim())||new Set(r.data.map((c:any)=>c.id)).size!==r.data.length)throw Error();if(active)setCentres(r.data);}catch{if(active)setError(true);}finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[owner,user?.id]);
 if(!owner)return null;
 if(!SITE_OPERATIONS_ENABLED)return <p className="mb-4 text-sm text-muted-foreground">Cross-centre owner selection requires the reviewed site operations activation. Current assigned-centre access remains available.</p>;
 return <section className="mb-4 rounded-xl border bg-card p-3 sm:p-5"><h2 className="font-semibold">Select centre security context</h2>{loading?<p role="status">Verifying active centres…</p>:error?<p role="alert">Active centre selection could not be verified.</p>:<label className="mt-2 block text-sm font-medium">Active centre<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={user?.tenantId||''} onChange={e=>{const value=e.target.value;setParams(previous=>{const next=new URLSearchParams(previous);if(value)next.set('centre',value);else next.delete('centre');return next;});}}><option value="">Use assigned centre / select</option>{centres.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}<p className="mt-2 text-xs text-muted-foreground">The server verifies global owner membership and the explicit active centre on every read or viewing request. Selecting a centre does not change your account profile.</p></section>;
}
