import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';

type Source={id:string;qualification_title:string;syllabus_code:string;specification_version:string};
type Rights={id:string;review_status:string;rights_basis:string;rights_holder:string;expires_at:string|null;created_by:string};
const allowedRoles=new Set(['lecturer','programme_leader','centre_director','superadmin']);

/** A claim is evidence for independent review, not automatic proof of copyright ownership. */
export default function MaterialRightsPanel({materialId,moduleId,tenantId}:{
 materialId:string;moduleId:string;tenantId:string;
}){
 const {user}=useAuth();
 const allowed=Boolean(user?.id&&user.tenantId===tenantId&&allowedRoles.has(user.role)&&user.roles?.includes(user.role));
 const [sources,setSources]=useState<Source[]>([]),[rights,setRights]=useState<Rights|null>(null);
 const [sourceId,setSourceId]=useState(''),[basis,setBasis]=useState('original_work');
 const [holder,setHolder]=useState(''),[evidence,setEvidence]=useState(''),[expires,setExpires]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{
  let active=true;
  setLoading(true);setSources([]);setRights(null);setError('');
  if(!allowed){setLoading(false);return()=>{active=false;};}
  void(async()=>{
   try{
    const [s,r]=await Promise.all([
     db.from('unipathway_course_specifications').select(
      'id,qualification_title,syllabus_code,specification_version'
     ).eq('tenant_id',tenantId).eq('module_id',moduleId).eq('review_status','reviewed')
      .order('created_at',{ascending:false}).limit(100),
     db.from('unipathway_material_rights').select(
      'id,review_status,rights_basis,rights_holder,expires_at,created_by'
     ).eq('tenant_id',tenantId).eq('material_id',materialId)
      .order('created_at',{ascending:false}).limit(1)
    ]);
    if(!active)return;
    if(s.error||r.error)throw Error('Registry cannot verify this draft.');
    setSources((s.data||[]) as Source[]);setRights((r.data||[])[0]||null);
   }catch{if(active)setError('Rights and qualification records could not be verified. Leave the material as a private draft.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[allowed,tenantId,moduleId,materialId,version]);
 async function propose(event:React.FormEvent){
  event.preventDefault();
  if(!allowed||busy||loading||error||rights&&rights.review_status!=='withdrawn')return;
  if(!sourceId||!holder.trim()||evidence.trim().length<8||basis==='licensed_redistribution'&&!expires){
   toast.error('Select a reviewed source, add the rights holder and evidence, and record licence expiry where applicable.');return;
  }
  const expiry=expires?new Date(expires):null;
  if(expiry&&(!Number.isFinite(expiry.getTime())||expiry.getTime()<=Date.now())){
   toast.error('The licence expiry date must be in the future.');return;
  }
  setBusy(true);
  try{
   const insert=await db.from('unipathway_material_rights').insert({
    tenant_id:tenantId,module_id:moduleId,material_id:materialId,specification_id:sourceId,
    rights_basis:basis,rights_holder:holder.trim(),evidence_reference:evidence.trim(),
    expires_at:expiry?.toISOString()||null,created_by:user!.id,review_status:'pending'
   }).select('id').single();
   if(insert.error||!insert.data?.id)throw Error('Rights evidence not recorded.');
   toast.success('Rights evidence saved for independent centre review. The material remains a private draft.');
   setSourceId('');setBasis('original_work');setHolder('');setEvidence('');setExpires('');
   setVersion(v=>v+1);
  }catch{toast.error('Rights evidence could not be saved or conflicts with a current proposal.');}
  finally{setBusy(false);}
 }
 if(!allowed)return <p role="alert">Only an authorised teaching account can record distribution rights.</p>;
 if(loading)return <p role="status">Verifying source and rights records…</p>;
 if(error)return <p role="alert">{error}</p>;
 return <section aria-label="Private material redistribution evidence" className="mt-3 space-y-3 rounded-xl border bg-background p-4">
  <h4 className="font-semibold">Distribution rights &amp; qualification source</h4>
  <p className="text-sm text-muted-foreground">Private access is not permission to copy a publisher's textbook, question bank, past paper or marking guide. Record the authority and approved source. This claim must be reviewed by a different centre manager before publishing.</p>
  {rights&&rights.review_status!=='withdrawn'?<div className="rounded-lg border p-3 text-sm">
   <p className="font-medium">Current rights proposal: {rights.review_status}</p>
   <p className="mt-1 text-muted-foreground">{rights.rights_holder} · {rights.rights_basis.replaceAll('_',' ')}</p>
   {rights.expires_at&&<p className="mt-1 text-muted-foreground">Recorded licence expiry: {new Date(rights.expires_at).toLocaleDateString()}</p>}
   {rights.review_status==='approved'&&<p className="mt-1">Only the live backend can finally confirm that the source review and rights are still current.</p>}
   {rights.review_status==='pending'&&<p className="mt-1 text-muted-foreground">Awaiting independent centre manager approval. Do not publish yet.</p>}
  </div>:!sources.length?<p role="status" className="rounded-lg border p-3 text-sm">No reviewed specification is linked to this module. Ask your programme leader to register and review the current version first.</p>:
  <form onSubmit={propose} className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-medium sm:col-span-2">Reviewed qualification specification
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" required value={sourceId} onChange={e=>setSourceId(e.target.value)}>
     <option value="">Choose approved source/version</option>
     {sources.map(s=><option key={s.id} value={s.id}>{s.qualification_title} · {s.syllabus_code} · {s.specification_version}</option>)}
    </select>
   </label>
   <label className="text-sm font-medium">Source rights category
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={basis} onChange={e=>setBasis(e.target.value)}>
     <option value="original_work">Original centre-authored work</option>
     <option value="licensed_redistribution">Written private redistribution licence</option>
     <option value="official_link_only">Official link only (file cannot be published)</option>
    </select>
   </label>
   <label className="text-sm font-medium">Rights holder / licensed publisher
    <Input className="mt-1 min-h-11" required minLength={3} maxLength={180} value={holder} onChange={e=>setHolder(e.target.value)}/>
   </label>
   <label className="text-sm font-medium sm:col-span-2">Evidence reference (contract, staff work declaration or approval ID)
    <Input className="mt-1 min-h-11" required minLength={8} maxLength={500} value={evidence} onChange={e=>setEvidence(e.target.value)}/>
   </label>
   <label className="text-sm font-medium">Licence expiry (where applicable)
    <Input type="date" className="mt-1 min-h-11" required={basis==='licensed_redistribution'} value={expires} onChange={e=>setExpires(e.target.value)}/>
   </label>
   <p className="text-xs text-muted-foreground self-end">Link-only sources belong in the structured lesson editor; they cannot authorise an uploaded copy.</p>
   <div className="sm:col-span-2"><Button type="submit" disabled={busy||!sourceId}>{busy?'Saving evidence…':'Submit for rights review'}</Button></div>
  </form>}
 </section>;
}
