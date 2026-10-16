import {useEffect, useRef, useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';

type Candidate = {user_id:string; full_name:string; email:string};
export default function LearnerPicker({tenant, disabled=false}:{tenant:string; disabled?:boolean}) {
 const [query,setQuery]=useState(''),[field,setField]=useState<'full_name'|'email'>('full_name');
 const [results,setResults]=useState<Candidate[]>([]),[selected,setSelected]=useState<Candidate|null>(null);
 const [loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const request=useRef(0);
 useEffect(()=>{request.current++;setSelected(null);setResults([]);setQuery('');setMessage('');setLoading(false);return()=>{request.current++;};},[tenant]);
 function clear(){request.current++;setSelected(null);setResults([]);setMessage('');setLoading(false);}
 async function search(){
  clear();const term=query.trim();if(term.length<2){setMessage('Enter at least two characters.');return;}
  const current=++request.current;setLoading(true);
  try{
   // A single typed filter avoids interpolating user text into PostgREST OR syntax.
   const escaped=term.replace(/[\\%_]/g,'\\$&');
   const {data,error}=await supabase.from('profiles').select('user_id,full_name,email').eq('tenant_id',tenant).ilike(field,`%${escaped}%`).order('full_name').order('user_id').limit(26);
   if(current!==request.current)return;
   if(error)throw error;
   setResults((data||[]).slice(0,25));setMessage((data||[]).length>25?'Showing the first 25 centre records. Refine your search.':data?.length?'Select the learner below. Student eligibility is checked when the application is created.':'No matching centre records. Try the registered email address.');
  }catch{if(current===request.current)setMessage('Centre records could not be searched. Check your access and retry.');}
  finally{if(current===request.current)setLoading(false);}
 }
 return <fieldset disabled={disabled} className="space-y-2 rounded border p-3 md:col-span-2">
  <legend className="px-1 font-medium">Find learner</legend>
  <div className="flex flex-wrap gap-2">
   <select aria-label="Search centre records by" className="border rounded p-2" value={field} onChange={e=>{clear();setField(e.target.value as typeof field);}}><option value="full_name">Name</option><option value="email">Email</option></select>
   <Input aria-label="Learner search" value={query} maxLength={150} placeholder="Enter name or registered email" onChange={e=>{clear();setQuery(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}}/>
   <Button type="button" variant="outline" disabled={loading} onClick={()=>void search()}>{loading?'Searching…':'Find learner'}</Button>
  </div>
  {message&&<p role="status" className="text-sm">{message}</p>}
  <label className="block">Learner<select name="student" required className="w-full border rounded p-2" value={selected?.user_id||''} onChange={e=>setSelected(results.find(r=>r.user_id===e.target.value)||null)}><option value="">Choose a matching centre record</option>{results.map(r=><option key={r.user_id} value={r.user_id}>{r.full_name} · {r.email}</option>)}</select></label>
  {selected&&<p className="text-sm">Selected: {selected.full_name} · {selected.email}</p>}
 </fieldset>;
}
