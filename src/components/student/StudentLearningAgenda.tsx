import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
import {rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {formatPakistanAcademicDate} from '@/lib/assessment/courseworkQueue';
import {buildStudentCourseworkAgenda} from '@/lib/assessment/studentAgenda';
import {chooseStudentStudyFocus} from '@/lib/assessment/studyFocus';
type Brief = {id: string; module_id:string; title: string; due_at: string; submission_cutoff: string; max_attempts:number};
type Attempt = {brief_id: string; attempt_no: number; status: string};
type Released = {attempt_id:string;brief_id:string};
type Session = {id: string; module_id: string; title: string; starts_at: string; ends_at: string};
type Snapshot<T> = {key:string;data:T;error:boolean};
export default function StudentLearningAgenda({tenant, student, moduleIds}: {tenant: string; student: string; moduleIds: string[]}) {
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {const timer=window.setInterval(() => setNow(Date.now()),60000);return () => window.clearInterval(timer);},[]);
  const refreshAgenda=()=>{setNow(Date.now());setRefresh(value=>value+1);};
  const key = JSON.stringify([tenant, student, [...new Set(moduleIds)].sort(), refresh]);
  const [work,setWork]=useState<Snapshot<{briefs:Brief[];attempts:Attempt[];released:Released[]}>|null>(null);
  const [classes,setClasses]=useState<Snapshot<Session[]>|null>(null);
  useEffect(() => {
    let active = true;
    void (async()=>{try{
      const briefs=await rowsByIds<Brief>(moduleIds,ids=>()=>db.from('unipathway_assessment_briefs').select('id,module_id,title,due_at,submission_cutoff,max_attempts').eq('tenant_id',tenant).eq('status','published').in('module_id',ids),()=>active);
      const [attempts,released]=await Promise.all([
        rowsByIds<Attempt>(briefs.map(b=>b.id),ids=>()=>db.from('unipathway_assessment_attempts').select('id,brief_id,attempt_no,status').eq('tenant_id',tenant).eq('student_id',student).in('brief_id',ids),()=>active),
        rowsByIds<Released>(briefs.map(b=>b.id),ids=>()=>db.from('unipathway_assessment_released_results').select('attempt_id,brief_id').eq('tenant_id',tenant).eq('student_id',student).in('brief_id',ids),()=>active,'attempt_id'),
      ]);
      if(active)setWork({key,data:{briefs,attempts,released},error:false});
    }catch{if(active)setWork({key,data:{briefs:[],attempts:[],released:[]},error:true});}})();
    void (async()=>{try{
      // A centre-wide scheduled session is not by itself a learner invitation.
      // Only show RLS-authorised sessions in the learner's active enrolled modules.
      if(!moduleIds.length){if(active)setClasses({key,data:[],error:false});return;}
      const r=await db.from('live_class_sessions').select('id,module_id,title,starts_at,ends_at').eq('tenant_id',tenant).in('module_id',moduleIds).in('status',['scheduled','live'])
        .gte('ends_at',new Date().toISOString()).order('starts_at').order('id').limit(5);
      if(r.error||!Array.isArray(r.data))throw Error('Unavailable');
      if(active)setClasses({key,data:r.data,error:false});
    }catch{if(active)setClasses({key,data:[],error:true});}})();
    return () => {active = false;};
  // key contains the complete request scope, with module order normalised.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current=work?.key===key?work:null,invited=classes?.key===key?classes:null;
  // The overview uses exactly the same conservative cutoff, attempt-limit and
  // independent-result rules as the full student coursework workspace.
  const agenda=buildStudentCourseworkAgenda(current?.data.briefs||[],current?.data.attempts||[],current?.data.released||[],now);
  // Guidance is calculated only after BOTH authorised reads have completed.
  // A stale, partial or denied response cannot become reassuring advice.
  const focus=current&&!current.error&&invited&&!invited.error
    ?chooseStudentStudyFocus(agenda,invited.data,moduleIds,now):null;
  const task=(brief:Brief,actionable:boolean)=><article className="rounded-lg border p-3 space-y-1" key={brief.id}>
    <p className="break-words font-medium">{brief.title}</p>
    <p className="text-sm text-muted-foreground">Due {formatPakistanAcademicDate(brief.due_at)} · Final cutoff {formatPakistanAcademicDate(brief.submission_cutoff)}</p>
    <p className="text-xs text-muted-foreground">{actionable?(Date.parse(brief.due_at)<now?'Due date passed; verify the final submission rules.':'Submission may be available; the coursework page will verify current permission.'):'You cannot currently submit this task. Review the cutoff, remaining attempts and centre guidance.'}</p>
    <Link className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to={'/student/assignments?'+new URLSearchParams({module:brief.module_id})}>Review module coursework</Link>
  </article>;
  return <section className="surface-card p-5 mb-6 space-y-4" aria-label="Current learning agenda">
    <h3 className="text-lg font-bold">Your next steps</h3>
    {focus&&<section aria-label="Suggested study focus" className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">Suggested focus · {focus.evidence}</p>
      <h4 className="text-base font-semibold break-words">{focus.title}</h4>
      <p className="text-sm leading-relaxed">{focus.detail}</p>
      <p className="text-xs text-muted-foreground">Based only on your authorised academic records. Check the linked workspace for current permissions; this is not a grade, class invitation or award decision.</p>
      <Link to={focus.href} className="inline-flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{focus.actionLabel}</Link>
    </section>}
    <section className="space-y-3" aria-label="Enrolled module class agenda"><h4 className="text-sm font-semibold">Upcoming sessions in your enrolled modules · Pakistan time</h4>
      <p className="text-xs text-muted-foreground">A separate approved class invitation and classroom permissions are still required to join. These listings do not create Teams meetings.</p>
      {!invited?<p role="status">Checking enrolled module sessions…</p>:invited.error?<p role="alert">Your enrolled module sessions could not be verified. Refresh to retry.</p>:<>
        {!invited.data.length&&<p className="text-sm text-muted-foreground">No upcoming sessions are visible for your active enrolled modules.</p>}
        {invited.data.map(session=><article className="rounded-lg border p-3" key={session.id}><p className="font-medium">{session.title}</p><p className="text-sm text-muted-foreground">{new Date(session.starts_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}</p><Link className="inline-flex min-h-11 items-center text-sm font-semibold underline" to={'/student/classroom?'+new URLSearchParams({module:session.module_id,session:session.id})}>Check classroom invitation and access →</Link></article>)}
      </>}
    </section>

    <section className="space-y-3" aria-label="Coursework agenda"><h4 className="font-semibold">Work due · Pakistan time</h4>
      {!current?<p role="status">Loading your coursework…</p>:current.error?<p role="alert">Your coursework could not be verified. Refresh to retry.</p>:<>
        <p className="text-sm font-semibold">{agenda.action.length} needing action · {agenda.review.length} awaiting review · {agenda.released.length} with released feedback</p>
        {!agenda.action.length&&<p className="text-sm text-muted-foreground">No coursework currently meets the submission-window and attempt rules. Submitted work may still await independent marking or IQA approval.</p>}
        {agenda.action.slice(0,5).map(brief=>task(brief,true))}
        {agenda.action.length>5&&<p className="text-sm">Showing the next five. Open coursework to review all {agenda.action.length} actionable tasks.</p>}
        {agenda.closed.length>0&&<details className="space-y-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{agenda.closed.length} {agenda.closed.length===1?'task cannot currently be submitted':'tasks cannot currently be submitted'}</summary>{agenda.closed.slice(0,5).map(brief=>task(brief,false))}{agenda.closed.length>5&&<p className="text-sm">Open coursework to review all {agenda.closed.length} unavailable tasks.</p>}</details>}
        {agenda.released.length>0&&<Link className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to="/student/grades">Read independently released feedback</Link>}
      </>}
    </section>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refreshAgenda}>Refresh agenda</Button><Button asChild variant="outline"><Link to="/student/assignments">Open coursework</Link></Button><Button asChild variant="outline"><Link to="/student/classroom">View class invitations</Link></Button><Button asChild variant="outline"><Link to="/student/materials">Materials and resources</Link></Button></div>
  </section>;
}
