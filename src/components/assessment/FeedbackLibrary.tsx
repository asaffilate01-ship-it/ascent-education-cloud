import {useEffect,useRef,useState} from 'react';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
type Snippet={id:string;title:string;body:string;created_at?:string};
type Props={onInsert:(text:string)=>boolean;disabled:boolean};
export default function FeedbackLibrary(props:Props){
 const {user}=useAuth();
 return <PrivateLibrary key={`${user?.id}:${user?.tenantId}:${user?.role}`} {...props}/>;
}
function PrivateLibrary({onInsert,disabled}:Props){
 const {user}=useAuth();const owner=user?.id,tenant=user?.tenantId;
 const [items,setItems]=useState<Snippet[]>([]),[title,setTitle]=useState(''),[body,setBody]=useState(''),[query,setQuery]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true),[verified,setVerified]=useState(false),[page,setPage]=useState(0);
 const mounted=useRef(true),operation=useRef(false),search=useRef<HTMLInputElement>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  let active=true;setItems([]);setVerified(false);setLoading(true);setError('');
  void (async()=>{try{
   if(!owner||!tenant)throw Error('Missing account');
   const rows=await pagedRows<Snippet>(()=>db.from('uni_feedback_snippets').select('id,title,body,created_at').eq('owner_id',owner).eq('tenant_id',tenant),()=>active);
   if(!active)return;
   setItems(rows.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')||a.id.localeCompare(b.id)));setVerified(true);
  }catch{if(active)setError('Your saved phrases could not be verified. Reload the library before using or changing phrases.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[owner,tenant,refresh]);
 const rows=items.filter(x=>`${x.title} ${x.body}`.toLowerCase().includes(query.trim().toLowerCase()));
 const pages=Math.max(1,Math.ceil(rows.length/10)),current=Math.min(page,pages-1);
 const duplicate=items.some(x=>x.title===title.trim()&&x.body===body.trim());
 const locked=busy||disabled||loading||!verified;
 const pending=(value:boolean)=>{operation.current=value;if(mounted.current)setBusy(value);};
 const invalidate=()=>{setVerified(false);setItems([]);};
 async function save(){
  if(operation.current||locked||!owner||!tenant||duplicate||!title.trim()||title.trim().length>80||body.trim().length<3||body.trim().length>2000)return;
  const payload={title:title.trim(),body:body.trim(),owner_id:owner,tenant_id:tenant};
  pending(true);setError('');setNotice('');
  try{
   const r=await db.from('uni_feedback_snippets').insert(payload).select('id,title,body').single();
   if(!mounted.current)return;
   if(r.error||typeof r.data?.id!=='string'||!r.data.id||r.data.title!==payload.title||r.data.body!==payload.body)throw Error('Unconfirmed save');
   setTitle('');setBody('');setNotice('Phrase saved to your private library.');invalidate();setPage(0);setRefresh(x=>x+1);
  }catch{if(mounted.current){invalidate();setError('Saving was not confirmed. Your wording is still here. Reload the library and check for a matching phrase before retrying.');}}
  finally{pending(false);}
 }
 async function remove(id:string){
  if(operation.current||locked||!owner||!tenant||!items.some(x=>x.id===id))return;
  if(!window.confirm('Delete this saved phrase? Feedback already submitted will stay unchanged.'))return;
  pending(true);setError('');setNotice('');
  try{
   const r=await db.from('uni_feedback_snippets').delete().eq('id',id).eq('owner_id',owner).eq('tenant_id',tenant).select('id');
   if(!mounted.current)return;
   if(r.error||r.data?.length!==1||r.data[0].id!==id)throw Error('Unconfirmed deletion');
   setNotice('Phrase deleted from your private library. Existing marking feedback is unchanged.');invalidate();setRefresh(x=>x+1);
  }catch{if(mounted.current){invalidate();setError('Deletion was not confirmed. Reload the library to check its current state before retrying.');}}
  finally{pending(false);}
 }
 return <details className="mt-3 border-t pt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">My reusable feedback</summary>
 <p className="my-2 text-sm text-muted-foreground">Private to your assessor account and centre. Save generic phrasing only, without student names or evidence. Insert a phrase, then tailor it to the individual learner and save the marking draft.</p>
 <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Find saved feedback<Input ref={search} type="search" maxLength={120} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><Button variant="outline" disabled={busy||loading} onClick={()=>{setNotice('');setRefresh(x=>x+1);}}>Reload feedback library</Button></div>
 {loading&&<p role="status" className="my-3 text-sm">Checking your private feedback library…</p>}
 {error&&<p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
 <p role="status" className="my-2 text-sm">{notice}</p>
 {verified&&!loading&&<><p role="status" aria-atomic="true" className="my-2 text-sm text-muted-foreground">{rows.length} matching phrases · {items.length} saved in your private library</p>
 {!rows.length&&<div className="my-3 rounded-lg border p-4"><p className="text-sm">{query.trim()?'No saved phrases match. Try another word or clear the search.':'No saved phrases yet. Add generic wording below to reuse in your marking drafts.'}</p>{query&&<Button className="mt-2" variant="outline" onClick={()=>{setQuery('');setPage(0);search.current?.focus();}}>Clear feedback search</Button>}</div>}
 <ul className="my-3 space-y-3">{rows.slice(current*10,current*10+10).map(x=><li key={x.id} className="rounded-lg border p-3"><strong className="break-words text-sm">{x.title}</strong><p className="my-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{x.body}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={locked} onClick={()=>{setNotice(onInsert(x.body)?'Phrase inserted into the current marking draft. Tailor it and save the draft to keep it.':'Phrase was not inserted. Your current marking feedback is unchanged.');}}>Insert phrase</Button><Button size="sm" variant="ghost" disabled={locked} onClick={()=>void remove(x.id)}>Delete phrase</Button></div></li>)}</ul>
 {rows.length>10&&<nav aria-label="Saved feedback pages" className="my-3 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={current===0||busy} onClick={()=>setPage(current-1)}>Previous phrases</Button><p role="status">Page {current+1} of {pages}</p><Button variant="outline" disabled={current+1>=pages||busy} onClick={()=>setPage(current+1)}>Next phrases</Button></nav>}</>}
 <fieldset disabled={busy||disabled} className="space-y-2"><legend className="text-sm font-semibold">Save a new phrase</legend><label className="block text-sm">Phrase title<Input maxLength={80} value={title} onChange={e=>{setTitle(e.target.value);setNotice('');}}/></label><label className="block text-sm">Reusable wording<Textarea maxLength={2000} value={body} onChange={e=>{setBody(e.target.value);setNotice('');}}/></label>{duplicate&&<p className="text-sm text-muted-foreground">A phrase with this exact title and wording is already saved. Search the library to use it.</p>}<Button variant="outline" disabled={locked||duplicate||!title.trim()||body.trim().length<3} onClick={()=>void save()}>{busy?'Saving change…':'Save phrase'}</Button></fieldset></details>;
}
