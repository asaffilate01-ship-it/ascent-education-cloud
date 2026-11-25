import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,CalendarDays,Download,Search,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {scholarshipSources,scholarshipSourcesReviewed,deadlineKinds,validateDeadline,calendarDateInPakistan,deadlineStatus,sortDeadlines,type DeadlineDraft,type DeadlineRecord,type DeadlineKind} from '@/lib/scholarshipResearch';

import {buildApplicationCalendar,calendarEligibleRecords} from '@/lib/applicationCalendarExport';

const emptyDraft:DeadlineDraft={title:'',kind:'Scholarship',date:'',source:''};
const statusLabels={completed:'Marked completed',past:'Past planning date',today:'Planning date today','next-seven-days':'Within 7 days',upcoming:'Upcoming planning date'} as const;
const inputClass='mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base font-normal';
export default function ScholarshipResearchPlanner(){
 const [country,setCountry]=useState('all');
 const [query,setQuery]=useState('');
 const [draft,setDraft]=useState<DeadlineDraft>(emptyDraft);
 const [records,setRecords]=useState<DeadlineRecord[]>([]);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [calendarReminder,setCalendarReminder]=useState(false);
 const today=calendarDateInPakistan();
 const q=query.trim().toLowerCase();
 const sources=scholarshipSources.filter(s=>(country==='all'||s.id===country)&&(!q||[s.country,s.provider,s.title,s.detail].join(' ').toLowerCase().includes(q)));
 const ordered=sortDeadlines(records);
 const exportable=calendarEligibleRecords(records,today);
 function exportCalendar(){
  if(!exportable.length)return;
  try{
   const content=buildApplicationCalendar(exportable,today,calendarReminder);
   const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='unipathway-application-planning.ics';
   document.body.appendChild(anchor);anchor.click();anchor.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setNotice('Calendar file requested. Open or import the file in your calendar app and verify the dates.');setError('');
  }catch{setError('Calendar file could not be created. Please try again.');}
 }
 function addDeadline(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  const item=validateDeadline(draft);
  if(!item){setError('Enter a valid title, calendar date and, if provided, an HTTPS source URL.');return;}
  if(records.length>=30){setError('This page can hold up to 30 planning entries. Remove an entry before adding another.');return;}
  if(records.some(r=>r.title.toLowerCase()===item.title.toLowerCase()&&r.date===item.date&&r.kind===item.kind)){setError('This planning entry is already on your list.');return;}
  setRecords(old=>[...old,{...item,id:crypto.randomUUID(),completed:false}]);setDraft(emptyDraft);setError('');setNotice('Planning entry added.');
 }
 return <div className="space-y-6" id="international-scholarship-research">
  <section aria-labelledby="scholarship-source-title" className="rounded-2xl border bg-card p-5 sm:p-7">
   <h2 id="scholarship-source-title" className="text-2xl font-bold">International scholarship research</h2>
   <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Search official public funding resources. These are research starting points, not a list of currently open awards. Check the specific call, applicant nationality, qualification, funding conditions and deadline before applying. The UniPathway Foundation is a separate funding service.</p>
   <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-semibold">Destination<select className={inputClass} value={country} onChange={e=>setCountry(e.target.value)}><option value="all">All destinations</option>{scholarshipSources.map(s=><option key={s.id} value={s.id}>{s.country}</option>)}</select></label><label className="block min-w-0 text-sm font-semibold"><Search aria-hidden="true" className="mr-1 inline size-4"/>Search funding sources<Input className="mt-2 min-h-11" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Scholarship, university, research…"/></label></div>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-muted-foreground">{sources.length} official resource{sources.length===1?'':'s'} found.</p><Button type="button" variant="outline" onClick={()=>{setCountry('all');setQuery('');}}>Clear filters</Button></div>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sources.map(s=><article key={s.id} className="flex min-w-0 flex-col rounded-xl border p-4"><p className="text-xs font-bold uppercase tracking-wide text-success">{s.country}</p><h3 className="mt-2 font-semibold">{s.title}</h3><p className="mt-1 text-xs text-muted-foreground">{s.provider}</p><p className="mt-3 flex-1 text-sm text-muted-foreground">{s.detail}</p><a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">Official funding resource <ArrowUpRight aria-hidden="true" className="size-4 shrink-0"/></a></article>)}</div>
   {!sources.length&&<p className="mt-4 rounded-lg border border-dashed p-4 text-sm">No matching resources. Try another search or ask admissions for guidance.</p>}
   <p className="mt-4 text-xs text-muted-foreground">Source directory reviewed {scholarshipSourcesReviewed}. Award amounts and application windows must be checked on the official source.</p>
  </section>
  <section aria-labelledby="deadline-planner-title" className="rounded-2xl border bg-card p-5 sm:p-7">
   <h2 id="deadline-planner-title" className="flex items-center gap-2 text-2xl font-bold"><CalendarDays aria-hidden="true" className="size-6 shrink-0"/>Application and scholarship deadline planner</h2>
   <p className="mt-3 text-sm text-muted-foreground">Record dates you have checked yourself. Use an earlier personal planning date when the official cutoff is in another timezone. Dates are compared with the Pakistan calendar; this does not determine exact official deadline times.</p>
   <p className="mt-3 rounded-lg border p-3 text-xs text-muted-foreground">Entries are held only while this page is open. They are not saved to an account or automatically synced to a calendar. You can choose to export your upcoming planning dates below. Do not enter personal identifiers, application numbers or documents.</p>
   <form onSubmit={addDeadline} className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="block min-w-0 text-sm font-semibold">Application or award name<Input className="mt-2 min-h-11" required maxLength={120} value={draft.title} onChange={e=>setDraft(old=>({...old,title:e.target.value}))} placeholder="Name of institution or funding programme"/></label>
    <label className="block min-w-0 text-sm font-semibold">Planning category<select className={inputClass} value={draft.kind} onChange={e=>setDraft(old=>({...old,kind:e.target.value as DeadlineKind}))}>{deadlineKinds.map(k=><option key={k}>{k}</option>)}</select></label>
    <label className="block min-w-0 text-sm font-semibold">Your planning date<Input className="mt-2 min-h-11" type="date" required value={draft.date} onChange={e=>setDraft(old=>({...old,date:e.target.value}))}/></label>
    <label className="block min-w-0 text-sm font-semibold">Official source URL (optional)<Input className="mt-2 min-h-11" type="url" maxLength={300} value={draft.source} onChange={e=>setDraft(old=>({...old,source:e.target.value}))} placeholder="https://…"/></label>
    <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" disabled={records.length>=30}>Add planning entry</Button><Button type="button" variant="outline" onClick={()=>{setDraft(emptyDraft);setError('');}}>Clear form</Button></div>
   </form>
   {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
   <p role="status" className="mt-4 text-sm text-muted-foreground">{notice||records.length+' planning entries'} · Pakistan date: {today}</p>
   <div className="mt-3 divide-y">{ordered.map(r=><article key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{r.title}</p><p className="mt-1 text-sm text-muted-foreground">{r.kind} · {r.date}</p><p className="mt-1 text-sm font-medium">{statusLabels[deadlineStatus(r.date,today,r.completed)]}</p>{r.source&&<p className="mt-1 break-all text-xs text-muted-foreground">Your recorded source: {r.source}</p>}</div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={()=>{setRecords(old=>old.map(item=>item.id===r.id?{...item,completed:!item.completed}:item));setNotice(r.completed?'Entry reopened.':'Entry marked completed.');}}>{r.completed?'Reopen':'Mark completed'}</Button><Button type="button" variant="outline" onClick={()=>{setRecords(old=>old.filter(item=>item.id!==r.id));setNotice('Planning entry removed.');}} aria-label={'Remove '+r.title}>Remove</Button></div></article>)}</div>
   {!records.length&&<p className="mt-3 text-sm text-muted-foreground">No personal planning entries yet.</p>}
   <div className="mt-5 rounded-xl border bg-muted/30 p-4"><h3 className="font-semibold">Export upcoming planning dates</h3><p className="mt-2 text-sm text-muted-foreground">{exportable.length} unfinished entries dated today or later can be exported as all-day events. Import the .ics file into your calendar application; this is a one-time export, not automatic synchronisation. Your entered source URLs are not exported.</p><label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={calendarReminder} onChange={e=>setCalendarReminder(e.target.checked)} className="size-5 shrink-0 accent-primary"/>Request a calendar reminder one day before each planning date</label><p className="mt-1 text-xs text-muted-foreground">Reminder delivery depends on the calendar application, notification settings and import support. Verify actual official cutoffs separately. Use generic titles on shared calendars.</p><Button type="button" className="mt-4 min-h-11" disabled={!exportable.length} onClick={exportCalendar}><Download aria-hidden="true" className="mr-2 size-4"/>Export calendar (.ics)</Button></div>
   <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4"><ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-success"/><p className="min-w-0 flex-1 text-sm text-muted-foreground">A planning entry is not an application, scholarship decision or proof of admission.</p><Button asChild variant="outline"><Link to="/consultation">Discuss your plans with an adviser</Link></Button></div>
  </section>
 </div>;
}
