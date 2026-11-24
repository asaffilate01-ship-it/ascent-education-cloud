import TeachingCompetencyReview from '@/components/admissions/TeachingCompetencyReview';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
type Kind='student'|'lecturer';
type Draft={user_id:string;kind:Kind;answers:Record<string,string>;updated_at:string};
export default function ApplicationReviewQueue({kind}:{kind:Kind}){
 const {user}=useAuth();
 const authorised=!!user?.tenantId && !!user?.roles?.includes(user.role) && (user.role==='centre_director'||user.role==='superadmin'||(kind==='student'&&user.role==='admissions_admin'));
 return authorised?<Queue key={user.id+':'+user.tenantId+':'+user.role+':'+kind} tenant={user.tenantId!} kind={kind}/>:null;
}
function Queue({tenant,kind}:{tenant:string;kind:Kind}){
 const [rows,setRows]=useState<Draft[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(false),[open,setOpen]=useState(false),[revision,setRevision]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{
  let active=true;setRows([]);setError(false);if(!open)return;
  setLoading(true);
  void (async()=>{
   const {data,error}=await (supabase.from as any)('onboarding_application_drafts').select('user_id,kind,answers,updated_at').eq('tenant_id',tenant).eq('kind',kind).order('updated_at',{ascending:false}).order('user_id',{ascending:true}).range(page*25,page*25+24);
   if(!active)return;if(error)throw error;
   setRows(Array.isArray(data)?data:[]);
  })().catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[tenant,kind,revision,open,page]);
 const visible=rows.filter(r=>String(r.answers?.['Full legal name']||'').toLowerCase().includes(search.toLowerCase()));
 return <section className="rounded-xl border bg-card p-4 mb-5 space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{kind==='student'?'Student application drafts':'Part-time lecturer application drafts'}</h2><Button variant="outline" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Close applications':'Review applications'}</Button></div>
 <p className="text-sm text-muted-foreground">Applicant-provided information only. Drafts are not submitted, verified or approved records.</p>
 {open&&<><div className="flex flex-wrap gap-2"><label className="text-sm">Filter current page by name <input className="block rounded border bg-background p-2" value={search} onChange={e=>setSearch(e.target.value)}/></label><Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Refresh</Button></div>
 {loading?<p role="status">Loading applications…</p>:error?<p role="alert">Applications could not be loaded. Check permissions or retry.</p>:<>{visible.length===0&&<p>No matching drafts on this page.</p>}{visible.map(r=><details key={r.user_id} className="rounded-lg border p-3"><summary className="cursor-pointer font-medium break-words">{r.answers?.['Full legal name']||'Unnamed applicant'} — Draft</summary><p className="text-xs text-muted-foreground mt-2">Updated {new Date(r.updated_at).toLocaleString()}</p><dl className="grid gap-3 sm:grid-cols-2 mt-3">{Object.entries(r.answers||{}).filter(([k,v])=>!k.endsWith(' — added')&&typeof v==='string'&&v.trim()).map(([key,value])=><div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground break-words">{key}</dt><dd className="text-sm whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>{kind==='lecturer'&&<TeachingCompetencyReview lecturerId={r.user_id} answers={r.answers}/>}</details>)}</>}
 <div className="flex items-center gap-3"><Button variant="outline" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><span className="text-sm">Page {page+1}</span><Button variant="outline" disabled={rows.length<25||loading||error} onClick={()=>setPage(p=>p+1)}>Next</Button></div></>}
 </section>;
}
