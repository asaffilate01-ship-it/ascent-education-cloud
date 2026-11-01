import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {READINESS_TRACKS,READINESS_FAMILIES,matchRequirements,trackInternalEvidenceCount,type RecordedCompliance} from '@/lib/operationsReadinessCatalog';

type Centre={id:string;name:string;slug:string};
const allowedRoles=new Set(['superadmin','centre_director','iqa_officer']);
export default function CentreComplianceReadiness(){
 const {user}=useAuth();
 return <ReadinessWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function ReadinessWorkspace(){
 const {user}=useAuth();
 const allowed=Boolean(user?.id&&user.role&&user.roles?.includes(user.role)&&allowedRoles.has(user.role));
 const platform=user?.role==='superadmin';
 const [centres,setCentres]=useState<Centre[]>([]),[centre,setCentre]=useState(user?.tenantId||'');
 const [records,setRecords]=useState<RecordedCompliance[]>([]);
 const [loading,setLoading]=useState(true),[centreError,setCentreError]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [family,setFamily]=useState('all'),[search,setSearch]=useState(''),[active,setActive]=useState('OTHM');
 const [draft,setDraft]=useState<{key:string;notes:string;reference:string}|null>(null);
 const [feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let current=true;setCentre(user?.tenantId||'');setCentres([]);setCentreError('');
  if(!allowed||!platform)return()=>{current=false;};
  void(async()=>{try{const r=await db.from('tenants').select('id,name,slug').order('name');
   if(r.error||!Array.isArray(r.data))throw Error('Centre selection could not be verified.');
   if(current)setCentres(r.data);
  }catch{if(current)setCentreError('The platform centre list is unavailable. Refresh before reviewing another centre.');}})();
  return()=>{current=false;};
 },[allowed,platform,user?.tenantId]);
 const load=useCallback(async(current:()=>boolean)=>{
  setLoading(true);setRecords([]);setError('');setFeedback('');
  if(!allowed||!centre){setLoading(false);return;}
  try{
   const data=await pagedRows<RecordedCompliance>(()=>db.from('compliance_checklists')
    .select('id,tenant_id,awarding_body,category,item_title,item_description,is_completed,evidence_notes,evidence_url,due_date,priority,updated_at')
    .eq('tenant_id',centre),current);
   if(current())setRecords(data);
  }catch{if(current())setError('The centre compliance inventory could not be verified. No progress values are displayed.');}
  finally{if(current())setLoading(false);}
 },[allowed,centre]);
 useEffect(()=>{let current=true;void load(()=>current);return()=>{current=false;};},[load,revision]);
 const groups=useMemo(()=>READINESS_TRACKS.filter(t=>(family==='all'||t.family===family)&&
  [t.label,t.authority,t.scope].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[family,search]);
 const track=READINESS_TRACKS.find(t=>t.key===active)||READINESS_TRACKS[0];
 const stats=trackInternalEvidenceCount(track,records,centre);
 const tasks=matchRequirements(track,records,centre);
 const scopeLink=platform?'/landlord/course-content':'/director/course-content';
 async function save(event:React.FormEvent){
  event.preventDefault();if(!allowed||!user||!centre||!draft||busy||loading||error)return;
  const check=tasks.find(t=>t.category+':'+t.title===draft.key);
  if(!check||draft.notes.trim().length<12){setFeedback('Use a specific evidence reference and at least 12 characters of review notes.');return;}
  if(draft.reference.trim()&&!/^https:\/\//i.test(draft.reference.trim())){
   setFeedback('Evidence URLs must use HTTPS. You can put an internal document reference in the notes instead.');return;
  }
  setBusy(true);setFeedback('');
  try{
   const payload={evidence_notes:draft.notes.trim(),evidence_url:draft.reference.trim()||null,
    is_completed:false,completed_by:null,completed_at:null};
   const response=check.record?
    await db.from('compliance_checklists').update(payload).eq('id',check.record.id)
      .eq('tenant_id',centre).eq('updated_at',check.record.updated_at).select('id').maybeSingle():
    await db.from('compliance_checklists').insert({...payload,tenant_id:centre,awarding_body:track.key,
     category:check.category,item_title:check.title,item_description:check.description,priority:check.priority}).select('id').maybeSingle();
   if(response.error||!response.data?.id)throw Error('The evidence draft could not be confirmed. Refresh before retrying.');
   setDraft(null);setFeedback('Internal evidence recorded for review. It is not an awarded accreditation or verified compliance approval.');
   setRevision(v=>v+1);
  }catch(e){setFeedback(e instanceof Error?e.message:'Could not verify evidence save.');}
  finally{setBusy(false);}
 }
 if(!allowed)return <DashboardLayout title="Compliance & qualifications"><p role="alert" className="rounded-xl border p-5">A verified Platform Owner, Centre Director or IQA role is required.</p></DashboardLayout>;
 return <DashboardLayout title="Compliance & qualifications" subtitle="Board, course, teaching and laboratory readiness with evidence">
  <div className="space-y-5">
   <section className="rounded-xl border bg-card p-5 space-y-3">
    <h2 className="font-semibold">Teaching readiness is not external approval</h2>
    <p className="text-sm text-muted-foreground">These are suggested internal checks, not an official checklist issued by every awarding body. Course preparation, exam-centre approval, vocational accreditation, IELTS registration partnerships, and funded training contracts require separate evidence and permissions. No qualification or licence is treated as approved merely because a teaching page exists.</p>
    {platform?<label className="block max-w-md text-sm font-medium">Centre to inspect
     <select value={centre} onChange={e=>{setCentre(e.target.value);setDraft(null);}} className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3">
      <option value="">Select a centre</option>{centres.map(c=><option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
     </select>
    </label>:<p className="text-sm text-muted-foreground">Assigned centre: {centre||'none'}</p>}
    {centreError&&<p role="alert">{centreError}</p>}
   </section>
   {!centre?<p role="status" className="rounded-xl border p-5">Select an authorised centre to load its readiness records.</p>:<>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Coverage by awarding body and service</h2>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Area
       <select value={family} onChange={e=>setFamily(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3">
        <option value="all">All qualification and service families</option>{READINESS_FAMILIES.map(f=><option key={f}>{f}</option>)}
       </select>
      </label>
      <label className="text-sm">Find a qualification or lab
       <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pearson, ATHE, IELTS, NAVTTC, language lab…" maxLength={120} className="mt-1"/>
      </label>
     </div>
     <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(g=><Button key={g.key} variant={active===g.key?'default':'outline'} className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left"
       onClick={()=>{setActive(g.key);setDraft(null);setFeedback('');}}>{g.label}</Button>)}
     </div>
     {!groups.length&&<p role="status" className="text-sm text-muted-foreground">No matching qualification or service area.</p>}
    </section>
    {loading&&<p role="status">Verifying centre compliance records…</p>}
    {error&&<div role="alert" className="rounded-xl border p-5">{error}<Button className="ml-3" variant="outline" onClick={()=>setRevision(v=>v+1)}>Retry</Button></div>}
    {!loading&&!error&&<section className="rounded-xl border bg-card p-5 space-y-4" aria-label="Readiness assessment details">
     <div>
      <h2 className="text-lg font-semibold">{track.label}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{track.scope}</p>
     </div>
     <div className="grid grid-cols-3 gap-3" aria-label="Recorded readiness evidence totals">
      {[['Suggested checks',stats.requirements],['Records',stats.recorded],['Internal notes',stats.evidenced]].map(([label,n])=>
       <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold tabular-nums">{n}</p></div>)}
     </div>
     <p className="text-xs text-muted-foreground">These are counts of internal records, not an official audit score. Complete/approved status must be verified separately by an authorised independent reviewer.</p>
     <div className="space-y-3">
      {tasks.map(t=><article key={t.category+':'+t.title} className="rounded-xl border p-4">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">{t.title}</h3><span className="text-xs text-muted-foreground">{t.record?'Recorded evidence':'No evidence'} · {t.priority} priority</span>
       </div>
       <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
       {t.record?.evidence_notes&&<p className="mt-2 text-sm">Evidence notes: {t.record.evidence_notes}</p>}
       <Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={()=>{setDraft({key:t.category+':'+t.title,notes:t.record?.evidence_notes||'',reference:t.record?.evidence_url||''});setFeedback('');}}>Record evidence reference</Button>
      </article>)}
     </div>
     {draft&&<form onSubmit={save} className="rounded-xl border bg-secondary/30 p-4 space-y-3" aria-label="Record internal compliance evidence">
      <h3 className="font-semibold">Evidence draft: {draft.key.split(':').slice(1).join(':')}</h3>
      <label className="block text-sm font-medium">Notes and approval reference
       <textarea required minLength={12} maxLength={2000} value={draft.notes} onChange={e=>setDraft(d=>d&&({...d,notes:e.target.value}))}
        rows={3} className="mt-1 w-full rounded-lg border bg-background p-3" placeholder="Document title, version, issuing body, reviewer and outstanding action"/>
      </label>
      <label className="block text-sm font-medium">Evidence document URL (optional)
       <Input type="url" maxLength={1000} value={draft.reference} onChange={e=>setDraft(d=>d&&({...d,reference:e.target.value}))}
        placeholder="https://…" className="mt-1"/>
      </label>
      <div className="flex gap-2"><Button disabled={busy} type="submit">Save as pending review</Button>
       <Button disabled={busy} type="button" variant="outline" onClick={()=>setDraft(null)}>Cancel</Button></div>
     </form>}
     {feedback&&<p role="status" className="rounded-lg border p-3 text-sm">{feedback}</p>}
     <div className="flex flex-wrap gap-3">
      <Link to={track.workspace.startsWith('/director')&&platform?scopeLink:track.workspace} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent">Open related workspace</Link>
      <a href={track.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent">Provider reference</a>
      <Link to={platform?'/landlord/readiness':'/director/readiness'} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent">Operational launch checks</Link>
     </div>
    </section>}
   </>}
  </div>
 </DashboardLayout>;
}
