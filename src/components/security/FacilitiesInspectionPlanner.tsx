import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {facilitiesCategories,validateInspectionDraft,inspectionTiming,pakistanCalendarDate,type InspectionDraft,type FacilitiesCategory} from '@/lib/facilitiesPlanning';

const initial:InspectionDraft={category:'fire_alarm',assetCode:'',location:'',dueDate:''};
export default function FacilitiesInspectionPlanner(){
 const [draft,setDraft]=useState<InspectionDraft>(initial);
 const [items,setItems]=useState<InspectionDraft[]>([]);
 const [error,setError]=useState('');
 function add(){
  try{
   const item=validateInspectionDraft(draft);
   if(items.some(row=>row.assetCode.toLowerCase()===item.assetCode.toLowerCase()))throw Error('This asset reference already exists in the draft.');
   setItems(old=>[...old,item]);setDraft(initial);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Unable to add draft');}
 }
 const today=pakistanCalendarDate();
 return <section className="mt-5 rounded-xl border bg-card p-5" aria-labelledby="inspection-planner">
  <h2 id="inspection-planner" className="font-semibold">Inspection planning draft</h2>
  <p className="mt-2 text-sm text-muted-foreground">Temporary session-only planning. Nothing is saved to the centre database. Reloading or leaving this workspace clears drafts. Do not use it as an official inspection register or emergency record.</p>
  <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();add();}}>
   <label className="text-sm font-medium">Equipment category<select className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={draft.category} onChange={e=>setDraft(old=>({...old,category:e.target.value as FacilitiesCategory}))}>{facilitiesCategories.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}</select></label>
   <label className="text-sm font-medium">Asset reference<Input required maxLength={80} value={draft.assetCode} onChange={e=>setDraft(old=>({...old,assetCode:e.target.value}))}/></label>
   <label className="text-sm font-medium">Confirmed location<Input required maxLength={160} value={draft.location} onChange={e=>setDraft(old=>({...old,location:e.target.value}))}/></label>
   <label className="text-sm font-medium">Planned inspection date (Pakistan)<Input required type="date" value={draft.dueDate} onChange={e=>setDraft(old=>({...old,dueDate:e.target.value}))}/></label>
   <Button type="submit" disabled={items.length>=100}>Add to temporary draft</Button>
  </form>
  {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  {items.length>0&&<div className="mt-4 divide-y">{items.map(item=><article key={item.assetCode} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.assetCode} · {item.category.replace(/_/g,' ')}</p><p className="text-sm text-muted-foreground">{item.location} · {item.dueDate} · {inspectionTiming(item.dueDate,today).replace(/-/g,' ')}</p></div><Button variant="outline" onClick={()=>setItems(old=>old.filter(row=>row.assetCode!==item.assetCode))}>Remove draft</Button></article>)}</div>}
 </section>;
}
