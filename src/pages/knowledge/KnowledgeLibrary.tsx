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
 const {user}=useAuth();const tenant=user?.tenantId;
 const manager=!student&&user?.roles.some(r=>['superadmin','centre_director','programme_leader'].includes(r));
 const version=useRef(0),searchVersion=useRef(0);
 const [documents,setDocuments]=useState<Document[]>([]),[selected,setSelected]=useState<Document|null>(null);
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[reference,setReference]=useState(''),[visibility,setVisibility]=useState('student');
 const [query,setQuery]=useState(''),[results,setResults]=useState<Citation[]>([]),[searched,setSearched]=useState(false);
 const [busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[error,setError]=useState(''),[searchError,setSearchError]=useState('');
 // Ignore late results whenever the query, centre or approved corpus changes.
 function invalidateSearch(){searchVersion.current++;setResults([]);setSearched(false);setSearching(false);setSearchError('');}
 const load=useCallback(async()=>{
  const id=++version.current;setError('');
  if(!tenant||!manager){setDocuments([]);return;}
  const result=await db.from('omniqora_knowledge_documents').select('id,title,source_text,visibility,content_reference,content_revision,approval_status').eq('tenant_id',tenant).eq('source_type','reviewed_text').order('updated_at',{ascending:false});
  if(id!==version.current)return;
  if(result.error){setDocuments([]);setError('The document library could not be loaded. Check database migration and permissions.');}
  else setDocuments((result.data||[]) as Document[]);
 },[tenant,manager]);
 function reset(){setSelected(null);setTitle('');setBody('');setReference('');setVisibility('student');}
 useEffect(()=>{reset();setDocuments([]);invalidateSearch();setQuery('');void load();return()=>{version.current++;searchVersion.current++;};},[load]);
 async function save(e:React.FormEvent){
  e.preventDefault();if(!tenant||busy)return;invalidateSearch();setBusy(true);
  try{
   const result=await db.rpc('save_education_knowledge',{p_tenant:tenant,p_title:title,p_text:body,p_visibility:visibility,p_reference:reference,p_document:selected?.id||null,p_expected_revision:selected?.content_revision??null});
   if(result.error)throw result.error;
   reset();toast.success('Draft saved. Review and approve before learners can search it.');await load();
  }catch(e){toast.error((e as Error).message||'Document could not be saved');}finally{setBusy(false);}
 }
 async function review(document:Document,decision:'approved'|'withdrawn'){
  if(busy)return;invalidateSearch();setBusy(true);
  try{const result=await db.rpc('review_education_knowledge',{p_document:document.id,p_expected_revision:document.content_revision,p_decision:decision});if(result.error)throw result.error;toast.success(decision==='approved'?`Approved and indexed ${result.data} passages`:'Document withdrawn from search');await load();}
  catch(e){toast.error((e as Error).message||'Review could not be saved');}finally{setBusy(false);}
 }
 async function search(e:React.FormEvent){
  e.preventDefault();if(!tenant||!query.trim())return;const id=++searchVersion.current;setSearching(true);setResults([]);setSearched(false);setSearchError('');
  try{const result=await db.rpc('search_education_chunks',{p_query:query.trim(),p_limit:10});if(result.error)throw result.error;if(id!==searchVersion.current)return;setResults((result.data||[]) as Citation[]);setSearched(true);}
  catch{if(id===searchVersion.current){setSearchError('Search is unavailable. Please try again.');toast.error('Search is unavailable. Please try again.');}}finally{if(id===searchVersion.current)setSearching(false);}
 }
 return <DashboardLayout title="Education Knowledge Library" subtitle="Search reviewed source passages with document and revision references">
  {!tenant?<p role="alert" className="surface-card p-5">A centre assignment is required.</p>:<>
   <section className="surface-card p-5 mb-6 space-y-4">
    <h2 className="font-semibold">Find guidance in approved materials</h2>
    <form onSubmit={search} className="flex gap-3"><Input aria-label="Search approved materials" required maxLength={1000} value={query} onChange={e=>{invalidateSearch();setQuery(e.target.value);}} placeholder="Search a topic or phrase"/><Button disabled={searching}>{searching?'Searching…':'Search'}</Button></form>
    <p className="text-xs text-muted-foreground">Results are exact source excerpts. They are not AI-generated answers. Only materials you are permitted to read appear.</p>
    {searchError&&<p role="alert" className="text-destructive">{searchError}</p>}
    {searched&&!results.length&&!searchError&&<p role="status">No approved source passages matched. Try another term or ask your programme team.</p>}
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
       try{const text=await file.text();if(text.length>200000)throw new Error('Text exceeds 200,000 characters');setBody(text);if(!reference)setReference(file.name);}catch(e){toast.error((e as Error).message||'File could not be read');}
      }}/></label>
      <label className="block text-sm">Document text<textarea required minLength={20} maxLength={200000} rows={12} className="w-full rounded border bg-background p-3 mt-1" value={body} onChange={e=>setBody(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Use approved teaching or institutional guidance. Do not paste student records, draft assessments or restricted marking material into learner-visible documents. PDF/Word extraction is not included.</p>
      <div className="flex gap-2"><Button disabled={busy}>Save draft</Button>{selected&&<Button type="button" variant="outline" onClick={reset}>Cancel edit</Button>}</div>
     </form>
    </section>
    <section className="surface-card p-5 space-y-4"><h2 className="font-semibold">Review and publication</h2>{error&&<p role="alert" className="text-destructive">{error}</p>}{!error&&!documents.length&&<p>No documents have been added yet.</p>}
     {documents.map(d=><article key={d.id} className="border rounded-lg p-4 space-y-3"><h3 className="font-medium">{d.title}</h3><p className="text-sm">Revision {d.content_revision} · {d.approval_status} · {d.visibility==='student'?'Learner visible on approval':'Academic staff only'}</p>
      <details><summary className="cursor-pointer text-sm">Review full source text</summary><p className="text-xs my-2">Source: {d.content_reference}</p><pre className="whitespace-pre-wrap font-sans text-sm max-h-80 overflow-y-auto">{d.source_text}</pre></details>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>{setSelected(d);setTitle(d.title);setReference(d.content_reference);setVisibility(d.visibility);setBody(d.source_text);}}>Edit</Button><Button disabled={busy||d.approval_status==='approved'} onClick={()=>void review(d,'approved')}>Approve and index</Button><Button variant="outline" disabled={busy||d.approval_status==='withdrawn'} onClick={()=>void review(d,'withdrawn')}>Withdraw</Button></div>
     </article>)}
    </section>
   </div>}
  </>}
 </DashboardLayout>;
}
