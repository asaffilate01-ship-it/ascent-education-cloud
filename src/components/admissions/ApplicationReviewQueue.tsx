import ApplicationStatus from '@/components/admissions/ApplicationStatus';
import ApplicationScreening from '@/components/admissions/ApplicationScreening';
import TeachingCompetencyReview from '@/components/admissions/TeachingCompetencyReview';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {applicationSections,applicationSectionAnswers,type ApplicationKind} from '@/lib/applicationSections';
import {ChevronDown,ChevronRight} from 'lucide-react';
type Draft={user_id:string;kind:ApplicationKind;answers:Record<string,string>;updated_at:string};
export default function ApplicationReviewQueue({kind}:{kind:ApplicationKind}){
 const {user,loading}=useAuth();
 const authorised=!loading&&!!user?.tenantId&&!!user?.roles?.includes(user.role)&&(user.role==='centre_director'||user.role==='superadmin'||(kind==='student'&&user.role==='admissions_admin'));
 return authorised?<Queue key={user.id+':'+user.tenantId+':'+user.role+':'+user.roles.join(',')+':'+kind} tenant={user.tenantId!} kind={kind}/>:null;
}
function Queue({tenant,kind}:{tenant:string;kind:ApplicationKind}){
 const [rows,setRows]=useState<Draft[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(false),[open,setOpen]=useState(false),[revision,setRevision]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0),[statusRevision,setStatusRevision]=useState(0),[expanded,setExpanded]=useState<string|null>(null),[hasNext,setHasNext]=useState(false);
 useEffect(()=>{
  let active=true;setRows([]);setError(false);setHasNext(false);setExpanded(null);if(!open){setLoading(false);return;}
  setLoading(true);
  void(async()=>{
   const {data,error}=await (supabase.from as any)('onboarding_application_drafts').select('user_id,tenant_id,kind,answers,updated_at').eq('tenant_id',tenant).eq('kind',kind).order('updated_at',{ascending:false}).order('user_id',{ascending:true}).range(page*25,page*25+25);
   if(!active)return;
   if(error||!Array.isArray(data)||data.length>26||data.some(r=>r.tenant_id!==tenant||r.kind!==kind||typeof r.user_id!=='string'||!r.answers||typeof r.answers!=='object'||Array.isArray(r.answers)||!Number.isFinite(Date.parse(r.updated_at))))throw Error('Application records unavailable');
   setRows(data.slice(0,25).map(r=>({...r,answers:Object.fromEntries(Object.entries(r.answers).filter(([,v])=>typeof v==='string'))})));
   setHasNext(data.length>25);
  })().catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[tenant,kind,revision,open,page]);
 const visible=rows.filter(r=>String(r.answers['Full legal name']||'').toLowerCase().includes(search.trim().toLowerCase()));
 function changePage(next:number){setRows([]);setExpanded(null);setLoading(true);setPage(next);}
 function refresh(){setExpanded(null);setLoading(true);setRevision(v=>v+1);}
 function toggle(){setOpen(v=>!v);setExpanded(null);}
 return <section className="rounded-xl border bg-card p-3 sm:p-5 mb-5 space-y-3 min-w-0">
 <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold">{kind==='student'?'Student application drafts':'Part-time lecturer application drafts'}</h2><p className="mt-1 text-sm text-muted-foreground">Review saved information and record screening decisions.</p></div><Button variant="outline" className="min-h-11 max-w-full whitespace-normal" onClick={toggle} aria-expanded={open}>{open?'Close applications':'Review applications'}</Button></div>
 <p className="text-sm text-muted-foreground">Screening requires a submitted current snapshot and does not verify identity or authorise enrolment.</p>
 {open&&<>
 <div className="grid gap-2 sm:flex sm:items-end"><label className="min-w-0 flex-1 text-sm font-medium">Filter current page by name<input type="search" maxLength={120} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base" value={search} onChange={e=>{setSearch(e.target.value);setExpanded(null);}}/></label><Button variant="outline" disabled={loading} onClick={refresh}>Refresh</Button>{search&&<Button variant="ghost" onClick={()=>{setSearch('');setExpanded(null);}}>Clear filter</Button>}</div>
 {loading?<p role="status">Loading applications…</p>:error?<div role="alert" className="space-y-2 rounded-lg border border-destructive p-3 text-sm"><p>Applications could not be loaded. Check permissions or retry.</p><Button variant="outline" onClick={refresh}>Retry applications</Button></div>:<>
 <p role="status" className="text-sm text-muted-foreground">{visible.length} of {rows.length} applications on this page</p>
 {visible.length===0&&<p className="rounded-lg border p-4 text-sm">{rows.length?'No matching drafts on this page.':'No application drafts on this page.'}</p>}
 <ul className="space-y-2">{visible.map(r=><li key={r.user_id} className="min-w-0 rounded-lg border"><button type="button" aria-expanded={expanded===r.user_id} onClick={()=>setExpanded(v=>v===r.user_id?null:r.user_id)} className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="min-w-0 [overflow-wrap:anywhere]"><span className="block font-medium">{r.answers['Full legal name']||'Unnamed applicant'} — Application</span><span className="mt-1 block text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} PKT</span></span>{expanded===r.user_id?<ChevronDown aria-hidden="true" className="size-4 shrink-0"/>:<ChevronRight aria-hidden="true" className="size-4 shrink-0"/>}</button>
 {expanded===r.user_id&&<div className="min-w-0 space-y-4 border-t p-3 sm:p-4"><ApplicationStatus userId={r.user_id} kind={kind} revision={revision+statusRevision}/><div className="space-y-2"><h3 className="font-semibold">Saved applicant details</h3>{applicationSections[kind].filter(s=>s.id!=='review').map(s=>{const entries=applicationSectionAnswers(s,r.answers);return <details key={s.id} className="min-w-0 rounded-lg border p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{s.title} · {entries.length} recorded fields</summary>{entries.length?<dl className="grid gap-3 sm:grid-cols-2">{entries.map(([key,value])=><div key={key} className="min-w-0 [overflow-wrap:anywhere]"><dt className="text-xs text-muted-foreground">{key}</dt><dd className="mt-1 text-sm whitespace-pre-wrap">{value}</dd></div>)}</dl>:<p className="text-sm text-muted-foreground">No details recorded.</p>}</details>;})}{(()=>{const known=new Set(applicationSections[kind].flatMap(s=>applicationSectionAnswers(s,r.answers).map(([k])=>k)));const extra=Object.entries(r.answers).filter(([k,v])=>!known.has(k)&&!k.endsWith(' — added')&&v.trim());return extra.length>0&&<details className="rounded-lg border p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Additional saved information</summary><dl className="grid gap-3 sm:grid-cols-2">{extra.map(([k,v])=><div key={k} className="min-w-0 [overflow-wrap:anywhere]"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-sm whitespace-pre-wrap">{v}</dd></div>)}</dl></details>;})()}</div><ApplicationScreening userId={r.user_id} kind={kind} answers={r.answers} onRecorded={()=>setStatusRevision(v=>v+1)}/>{kind==='lecturer'&&<TeachingCompetencyReview tenantId={tenant} lecturerId={r.user_id} answers={r.answers}/>}</div>}
 </li>)}</ul></>}
 <nav aria-label="Application pages" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===0||loading} onClick={()=>changePage(page-1)}>Previous</Button><span className="text-sm">Page {page+1}</span><Button variant="outline" disabled={!hasNext||loading||error} onClick={()=>changePage(page+1)}>Next</Button></nav></>}
 </section>;
}
