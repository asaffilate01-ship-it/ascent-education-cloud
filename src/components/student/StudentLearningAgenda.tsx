import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
import {rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
type Brief = {id: string; module_id:string; title: string; due_at: string; submission_cutoff: string};
type Attempt = {brief_id: string; attempt_no: number; status: string};
type Session = {id: string; title: string; starts_at: string; ends_at: string};
type Snapshot<T> = {key:string;data:T;error:boolean};
export default function StudentLearningAgenda({tenant, student, moduleIds}: {tenant: string; student: string; moduleIds: string[]}) {
  const [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([tenant, student, [...new Set(moduleIds)].sort(), refresh]);
  const [work,setWork]=useState<Snapshot<{briefs:Brief[];attempts:Attempt[]}>|null>(null);
  const [classes,setClasses]=useState<Snapshot<Session[]>|null>(null);
  useEffect(() => {
    let active = true;
    void (async()=>{try{
      const briefs=await rowsByIds<Brief>(moduleIds,ids=>()=>db.from('unipathway_assessment_briefs').select('id,module_id,title,due_at,submission_cutoff').eq('tenant_id',tenant).eq('status','published').in('module_id',ids),()=>active);
      const attempts=await rowsByIds<Attempt>(briefs.map(b=>b.id),ids=>()=>db.from('unipathway_assessment_attempts').select('id,brief_id,attempt_no,status').eq('tenant_id',tenant).eq('student_id',student).in('brief_id',ids),()=>active);
      if(active)setWork({key,data:{briefs,attempts},error:false});
    }catch{if(active)setWork({key,data:{briefs:[],attempts:[]},error:true});}})();
    void (async()=>{try{
      const r=await db.from('live_class_sessions').select('id,title,starts_at,ends_at').eq('tenant_id',tenant).in('status',['scheduled','live'])
        .gte('ends_at',new Date().toISOString()).order('starts_at').order('id').limit(5);
      if(r.error||!Array.isArray(r.data))throw Error('Unavailable');
      if(active)setClasses({key,data:r.data,error:false});
    }catch{if(active)setClasses({key,data:[],error:true});}})();
    return () => {active = false;};
  // key contains the complete request scope, with module order normalised.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current=work?.key===key?work:null,invited=classes?.key===key?classes:null;
  const latest=new Map<string,Attempt>();
  current?.data.attempts.forEach(a=>{if(!latest.has(a.brief_id)||latest.get(a.brief_id)!.attempt_no<a.attempt_no)latest.set(a.brief_id,a);});
  const pending=(current?.data.briefs||[]).filter(b=>!latest.has(b.id)||latest.get(b.id)?.status==='resubmission_requested')
    .sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at)||a.id.localeCompare(b.id));
  const now=Date.now(),open=pending.filter(b=>Date.parse(b.submission_cutoff)>=now),closed=pending.filter(b=>Date.parse(b.submission_cutoff)<now);
  const task=(brief:Brief)=><article className="border rounded p-3 space-y-1" key={brief.id}><p>{brief.title}</p><p className="text-sm text-muted-foreground">Due {new Date(brief.due_at).toLocaleString()} · {Date.parse(brief.submission_cutoff)<now?'Submission window closed—contact your programme team':Date.parse(brief.due_at)<now?'Overdue—check submission rules':'Upcoming'}</p><Link className="text-sm underline" to={`/student/assignments?${new URLSearchParams({module:brief.module_id})}`}>Open module coursework</Link></article>;
  return <section className="surface-card p-5 mb-6 space-y-4" aria-label="Current learning agenda">
    <h3 className="font-semibold">Coursework and invited classes</h3>
    <section className="space-y-3" aria-label="Coursework agenda">
      {!current?<p role="status">Loading your coursework…</p>:current.error?<p role="alert">Your coursework could not be verified. Refresh to retry.</p>:<>
        <h4 className="text-sm font-semibold">{open.length} coursework {open.length===1?'task':'tasks'} with an open submission window</h4>
        {!pending.length&&<p className="text-sm text-muted-foreground">No published coursework currently needs a submission.</p>}
        {open.slice(0,5).map(task)}
        {open.length>5&&<p className="text-sm">Showing the next five. Open coursework to review all {open.length} tasks.</p>}
        {closed.length>0&&<details className="space-y-3"><summary className="cursor-pointer text-sm font-semibold">{closed.length} {closed.length===1?'task with a closed submission window':'tasks with closed submission windows'}</summary>{closed.slice(0,5).map(task)}{closed.length>5&&<p className="text-sm">Open coursework to review all closed tasks.</p>}</details>}
      </>}
    </section>
    <section className="space-y-3" aria-label="Invited class agenda"><h4 className="text-sm font-semibold">Next invited classes</h4>
      {!invited?<p role="status">Loading your class invitations…</p>:invited.error?<p role="alert">Your class invitations could not be verified. Refresh to retry.</p>:<>
        {!invited.data.length&&<p className="text-sm text-muted-foreground">No upcoming class invitations are available.</p>}
        {invited.data.map(session=><p className="text-sm" key={session.id}>{session.title} · {new Date(session.starts_at).toLocaleString()}</p>)}
      </>}
    </section>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setRefresh(x=>x+1)}>Refresh agenda</Button><Button asChild variant="outline"><Link to="/student/assignments">Open coursework</Link></Button><Button asChild variant="outline"><Link to="/student/classroom">View class invitations</Link></Button><Button asChild variant="outline"><Link to="/student/ielts">IELTS and audio lab</Link></Button></div>
  </section>;
}
