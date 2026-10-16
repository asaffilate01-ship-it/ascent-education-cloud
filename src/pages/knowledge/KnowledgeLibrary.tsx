import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
const db:SupabaseClient=supabase;
type Document={id:string;title:string;source_text:string;visibility:string;content_reference:string;content_revision:number;approval_status:string};
type Citation={document_id:string;chunk_index:number;revision:number;title:string;excerpt:string;source_reference:string;rank:number};
export default function KnowledgeLibrary({student=false}:{student?:boolean}) {
 const {user}=useAuth();
 return <LibraryWorkspace key={`${user?.tenantId}-${user?.id}-${user?.roles.join(',')}-${student}`} student={student}/>;
}
function LibraryWorkspace({student}:{student:boolean}) {
 const {user}=useAuth();const tenant=user?.tenantId;
 const manager=!student&&user?.roles.some(r=>['superadmin','centre_director','programme_leader'].includes(r));
 const version=useRef(0),searchVersion=useRef(0),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const [listLoading,setListLoading]=useState(true),[listQuery,setListQuery]=useState(''),[reviewFilter,setReviewFilter]=useState('all'),[audienceFilter,setAudienceFilter]=useState('all'),[page,setPage]=useState(0);
 const [documents,setDocuments]=useState<Document[]>([]),[selected,setSelected]=useState<Document|null>(null);
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[reference,setReference]=useState(''),[visibility,setVisibility]=useState('student');
 const [query,setQuery]=useState(''),[results,setResults]=useState<Citation[]>([]),[searched,setSearched]=useState(false);
 const [busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  const id=++version.current;setError('');setListLoading(true);setDocuments([]);
  if(!tenant||!manager){setListLoading(false);return;}
  try{const rows:Document[]=[];
   for(let offset=0;;offset+=100){const result=await db.from('omniqora_knowledge_documents').select('id,title,source_text,visibility,content_reference,content_revision,approval_status').eq('tenant_id',tenant).eq('source_type','reviewed_text').order('updated_at',{ascending:false}).order('id').range(offset,offset+99);
    if(id!==version.current)return;if(result.error)throw result.error;rows.push(...(result.data||[]) as Document[]);if((result.data||[]).length<100)break;
   }setDocuments(rows);
  }catch{if(id===version.current)setError('The document library could not be loaded completely. Retry before reviewing documents.');}
  finally{if(id===version.current)setListLoading(false);}
 },[tenant,manager]);
 function reset(){setSelected(null);setTitle('');setBody('');setReference('');setVisibility('student');}
 useEffect(()=>{reset();setDocuments([]);setResults([]);setSearching(false);setSearched(false);setQuery('');void load();return()=>{version.current++;searchVersion.current++;};},[load]);
 async function save(e:React.FormEvent){
  e.preventDefault();if(!tenant||busy)return;setBusy(true);
  try{
   const result=await db.rpc('save_education_knowledge',{p_tenant:tenant,p_title:title,p_text:body,p_visibility:visibility,p_reference:reference,p_document:selected?.id||null,p_expected_revision:selected?.content_revision??null});
   if(!active.current)return;if(result.error)throw result.error;
   reset();setResults([]);setSearched(false);toast.success('Draft saved. Review and approve before learners can search it.');await load();
  }catch(e){if(active.current)toast.error((e as Error).message||'Document could not be saved');}finally{if(active.current)setBusy(false);}
 }
 async function review(document:Document,decision:'approved'|'withdrawn'){
  if(busy)return;setBusy(true);
  try{const result=await db.rpc('review_education_knowledge',{p_document:document.id,p_expected_revision:document.content_revision,p_decision:decision});if(!active.current)return;if(result.error)throw result.error;setResults([]);setSearched(false);toast.success(decision==='approved'?`Approved and indexed ${result.data} passages`:'Document withdrawn from search');await load();}
  catch(e){if(active.current)toast.error((e as Error).message||'Review could not be saved');}finally{if(active.current)setBusy(false);}
 }
 async function search(e:React.FormEvent){
  e.preventDefault();if(!query.trim())return;const id=++searchVersion.current;setSearching(true);setResults([]);setSearched(false);
  try{const result=await db.rpc('search_education_chunks',{p_query:query.trim(),p_limit:10});if(result.error)throw result.error;if(id!==searchVersion.current)return;setResults((result.data||[]) as Citation[]);setSearched(true);}
  catch{if(id===searchVersion.current)toast.error('Search is unavailable. Please try again.');}finally{if(id===searchVersion.current)setSearching(false);}
 }
 const filtered=documents.filter(d=>(reviewFilter==='all'||d.approval_status===reviewFilter)&&(audienceFilter==='all'||d.visibility===audienceFilter)&&[d.title,d.content_reference].some(v=>v.toLowerCase().includes(listQuery.trim().toLowerCase())));
 const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/12)-1));
 return <DashboardLayout title="Education Knowledge Library" subtitle="Search reviewed source passages with document and revision references">
  {!tenant?<p role="alert" className="surface-card p-5">A centre assignment is required.</p>:<>
   <section className="surface-card p-5 mb-6 space-y-4">
    <h2 className="font-semibold">Find guidance in approved materials</h2>
    <form onSubmit={search} className="flex gap-3"><Input aria-label="Search approved materials" required maxLength={1000} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a topic or phrase"/><Button disabled={searching}>{searching?'Searching…':'Search'}</Button></form>
    <p className="text-xs text-muted-foreground">Results are exact source excerpts. They are not AI-generated answers. Only materials you are permitted to read appear.</p>
    {searched&&!results.length&&<p role="status">No approved source passages matched. Try another term or ask your programme team.</p>}
    {results.map(c=><article key={`${c.document_id}:${c.revision}:${c.chunk_index}`} className="border rounded-lg p-4 space-y-2"><h3 className="font-semibold">{c.title}</h3><p className="text-xs text-muted-foreground">Revision {c.revision} · Passage {c.chunk_index+1} · {c.source_reference}</p><blockquote className="text-sm whitespace-pre-wrap">{c.excerpt}</blockquote></article>)}
   </section>
   {manager&&<div className="grid xl:grid-cols-2 gap-6">
    <section className="surface-card p-5 space-y-4"><h2 className="font-semibold">{selected?'Edit document — review required again':'Add a source document'}</h2>
     <form onSubmit={save} className="space-y-4">
      <label className="block text-sm">Title<Input required minLength={3} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label className="block text-sm">Source reference<Input required maxLength={500} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Policy name, document code or controlled source URL"/></label>
      <label className="block text-sm">Audience<select className="w-full border rounded p-2" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="student">Learners and academic staff</option><option value="staff">Academic staff only</option></select></label>
      <label className="block text-sm">Import plain text (optional)<Input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={async e=>{
       const file=e.target.files?.[0];if(!file)return;if(file.size>800000||!(/\.(txt|md)$/i.test(file.name))){toast.error('Choose a TXT or Markdown file below 800 KB');return;}
       try{const text=await file.text();if(text.length>200000)throw new Error('Text exceeds 200,000 characters');if(!active.current)return;setBody(text);if(!reference)setReference(file.name);}catch(e){toast.error((e as Error).message||'File could not be read');}
      }}/></label>
      <label className="block text-sm">Document text<textarea required minLength={20} maxLength={200000} rows={12} className="w-full rounded border bg-background p-3 mt-1" value={body} onChange={e=>setBody(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Use approved teaching or institutional guidance. Do not paste student records, draft assessments or restricted marking material into learner-visible documents. PDF/Word extraction is not included.</p>
      <div className="flex gap-2"><Button disabled={busy}>Save draft</Button>{selected&&<Button type="button" variant="outline" onClick={reset}>Cancel edit</Button>}</div>
     </form>
    </section>
    <section className="surface-card p-5 space-y-4"><h2 className="font-semibold">Review and publication</h2>{error&&<p role="alert" className="text-destructive">{error}</p>}<Button variant="outline" disabled={busy||listLoading} onClick={()=>void load()}>Refresh review queue</Button>{listLoading&&<p role="status">Loading review queue…</p>}{!listLoading&&!error&&<><div className="space-y-3"><label>Find documents<Input value={listQuery} onChange={e=>{setListQuery(e.target.value);setPage(0);}} placeholder="Title or source reference"/></label><label>Review status<select className="block border rounded p-2 bg-background" value={reviewFilter} onChange={e=>{setReviewFilter(e.target.value);setPage(0);}}><option value="all">All review states</option>{[...new Set(documents.map(d=>d.approval_status))].sort().map(status=><option key={status}>{status}</option>)}</select></label><label>Document audience<select className="block border rounded p-2 bg-background" value={audienceFilter} onChange={e=>{setAudienceFilter(e.target.value);setPage(0);}}><option value="all">All audiences</option><option value="student">Learners and staff</option><option value="staff">Staff only</option></select></label></div><p>{filtered.length} matching documents · {documents.length} in this snapshot</p>{!filtered.length&&<p>No documents match this review view.</p>}</>}
     {filtered.slice(current*12,current*12+12).map(d=><article key={d.id} className="border rounded-lg p-4 space-y-3"><h3 className="font-medium">{d.title}</h3><p className="text-sm">Revision {d.content_revision} · {d.approval_status} · {d.visibility==='student'?'Learner visible on approval':'Academic staff only'}</p>
      <details><summary className="cursor-pointer text-sm">Review full source text</summary><p className="text-xs my-2">Source: {d.content_reference}</p><pre className="whitespace-pre-wrap font-sans text-sm max-h-80 overflow-y-auto">{d.source_text}</pre></details>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>{setSelected(d);setTitle(d.title);setReference(d.content_reference);setVisibility(d.visibility);setBody(d.source_text);}}>Edit</Button><Button disabled={busy||d.approval_status==='approved'} onClick={()=>void review(d,'approved')}>Approve and index</Button><Button variant="outline" disabled={busy||d.approval_status==='withdrawn'} onClick={()=>void review(d,'withdrawn')}>Withdraw</Button></div>
     </article>)}
     {!listLoading&&!error&&filtered.length>0&&<div className="flex items-center gap-3"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous documents</Button><span>Page {current+1} of {Math.ceil(filtered.length/12)}</span><Button variant="outline" disabled={(current+1)*12>=filtered.length} onClick={()=>setPage(current+1)}>Next documents</Button></div>}
    </section>
   </div>}
  </>}
 </DashboardLayout>;
}
