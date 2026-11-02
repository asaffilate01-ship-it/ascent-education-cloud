
import {useEffect,useState} from 'react';
import {db} from '@/lib/db';
import {PHYSICAL_SECURITY_ENABLED,physicalSecurityScope,requireCentreRows} from '@/lib/physicalSecurity';

type PhysicalTable='centre_occupancy'|'centre_access_events'|'centre_visitors'|'cctv_cameras'|'security_devices'|'emergency_muster_events'|'emergency_muster_status';
type Principal={id:string;tenantId?:string;role:string;roles?:readonly string[]}|null|undefined;
type ScopedResult<T>={key:string;data:T[];loading:boolean;error:string|null};
const PAGE_SIZE=200;
const MAX_PAGES=5;
/** Read only selected fields, always with an explicit centre predicate AND server RLS. Never show truncated counts as totals. */
export function useScopedSecurityRows<T extends {tenant_id:string}>(
 user:Principal,table:PhysicalTable,fields:string,orderColumn:string,
 extra?:{column:string;value:string},
 run=true,
){
 const tenant=physicalSecurityScope(user);
 const enabled=PHYSICAL_SECURITY_ENABLED&&!!tenant&&run;
 const [revision,setRevision]=useState(0);
 const key=JSON.stringify([user?.id,user?.role,user?.roles,tenant,enabled,table,fields,orderColumn,extra,run,revision]);
 const [state,setState]=useState<ScopedResult<T>>({key,data:[],loading:enabled,error:null});
 useEffect(()=>{
  let active=true;
  if(!enabled||!tenant){setState({key,data:[],loading:false,error:null});return()=>{active=false;};}
  setState({key,data:[],loading:true,error:null});
  void (async()=>{
   const results:T[]=[];
   for(let page=0;page<MAX_PAGES;page++){
    if(extra&&(table!=='emergency_muster_status'||extra.column!=='muster_event_id'))throw Error('Unsupported secure filter');
    const {data,error}=await db.rpc('get_unipathway_security_operations_rows',{
      p_tenant:tenant,p_kind:table,p_offset:page*PAGE_SIZE,p_limit:PAGE_SIZE,
      p_event_id:extra?.value||null,
    });
    if(!active)return;
    if(error||!Array.isArray(data)||data.length>PAGE_SIZE)throw Error('Secure centre query failed');
    results.push(...requireCentreRows(data as T[],tenant));
    if(data.length<PAGE_SIZE){setState({key,data:results,loading:false,error:null});return;}
   }
   throw Error('Centre record limit reached; a verified server report is required');
  })().catch(()=>{if(active)setState({key,data:[],loading:false,error:'Centre access or completeness could not be verified. No partial records are displayed.'});});
  return()=>{active=false;};
 // The backend projects fixed columns for each kind and ignores caller-defined field/order metadata.
 // The serialized key captures the full principal, request, permissions and refresh counter.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 const visible=state.key===key?state:{key,data:[] as T[],loading:enabled,error:null};
 return {...visible,refresh:()=>setRevision(n=>n+1)};
}
