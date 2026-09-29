import { db } from '@/lib/db';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, RefreshCw, Sparkles, AlertTriangle, ChevronRight, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const FLOW=['Submitted','Integrity','AI Draft','Assessor','IQA','Released'];

export default function AssessorDashboard() {
 const [attempts,setAttempts]=useState<any[]>([]),[decisions,setDecisions]=useState<any[]>([]),[drafts,setDrafts]=useState<any[]>([]);
 const [selected,setSelected]=useState<any|null>(null),[loading,setLoading]=useState(true),[running,setRunning]=useState(false);
 const load=async()=>{setLoading(true);const [a,d,x]=await Promise.all([
  db.from('submission_attempts').select('*').order('submitted_at',{ascending:false}).limit(100),
  db.from('assessor_decisions').select('*').order('decided_at',{ascending:false}).limit(100),
  db.from('ai_assessment_drafts').select('*').order('created_at',{ascending:false}).limit(100)
 ]);setAttempts(a.data||[]);setDecisions(d.data||[]);setDrafts(x.data||[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const decided=useMemo(()=>new Set(decisions.map(d=>d.submission_attempt_id)),[decisions]);
 const queue=attempts.filter(a=>!decided.has(a.id)&&['submitted','integrity_checked','ai_drafted','assessor_review'].includes(a.status));
 const draft=selected?drafts.find(d=>d.submission_attempt_id===selected.id):null;
 const runAI=async()=>{if(!selected)return;setRunning(true);const {data,error}=await supabase.functions.invoke('ai-assessment-agent',{body:{attemptId:selected.id}});setRunning(false);if(error||data?.error){toast.error(data?.error||error?.message||'AI assessment failed');return}toast.success('Criterion analysis ready for human review');await load();setSelected({...selected,status:'ai_drafted'})};
 return <DashboardLayout title="Assessor Workspace" subtitle="Evidence-led human assessment with AI decision support">
  <div className="workflow-strip mb-5">{FLOW.map((s,i)=><div key={s} className={'workflow-step '+(i===3?'workflow-step-active':i<3?'workflow-step-done':'')}>{i+1}. {s}</div>)}</div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
   <StatCard label="To Assess" value={queue.length} icon={ClipboardCheck}/><StatCard label="Resubmissions" value={attempts.filter(a=>a.status==='resubmission_required').length} icon={RefreshCw}/>
   <StatCard label="AI Ready" value={attempts.filter(a=>a.status==='ai_drafted').length} icon={Sparkles}/><StatCard label="Late Attempts" value={attempts.filter(a=>a.is_late).length} icon={AlertTriangle}/>
  </div>
  <div className="academic-grid">
   <Card><CardHeader><CardTitle className="text-sm">My assessment queue</CardTitle></CardHeader><CardContent className="p-0">
    {loading?<p className="p-5 text-sm text-muted-foreground">Loading…</p>:queue.length===0?<p className="p-5 text-sm text-muted-foreground">No assessment work currently assigned.</p>:queue.map(a=><button key={a.id} onClick={()=>setSelected(a)} className={'w-full text-left px-4 py-3 border-t first:border-t-0 hover:bg-muted/50 flex items-center gap-3 '+(selected?.id===a.id?'bg-primary/5':'')}>
     <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary"/></div>
     <div className="flex-1 min-w-0"><p className="text-sm font-semibold">Submission {a.submission_id.slice(0,8)}</p><p className="text-xs text-muted-foreground">Attempt {a.attempt_number} · {new Date(a.submitted_at).toLocaleString('en-GB')}</p></div>
     {a.is_late&&<StatusBadge status="Late" variant="warning"/>}<StatusBadge status={a.status}/><ChevronRight className="w-4 h-4 text-muted-foreground"/>
    </button>)}
   </CardContent></Card>
   <div className="space-y-4">
    {!selected?<div className="evidence-panel flex flex-col items-center justify-center text-center"><ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mb-3"/><p className="font-semibold">Select a submission</p><p className="text-xs text-muted-foreground mt-1">Evidence, AI analysis and human controls appear here.</p></div>:<>
     <div className="evidence-panel"><div className="flex items-start justify-between gap-3 mb-4"><div><p className="text-label">Selected evidence</p><h2 className="font-bold mt-1">Attempt {selected.attempt_number}</h2></div><StatusBadge status={selected.status}/></div>
      <div className="grid grid-cols-2 gap-2 text-xs"><div className="surface-data p-3"><p className="text-muted-foreground">Submitted</p><p className="font-semibold mt-1">{new Date(selected.submitted_at).toLocaleString('en-GB')}</p></div><div className="surface-data p-3"><p className="text-muted-foreground">Deadline</p><p className="font-semibold mt-1">{selected.deadline_at?new Date(selected.deadline_at).toLocaleString('en-GB'):'—'}</p></div></div>
      {!draft?<Button className="w-full mt-4" onClick={runAI} disabled={running}><Sparkles className="w-4 h-4 mr-2"/>{running?'Analysing criteria…':'Run AI criteria analysis'}</Button>:<div className="mt-4 space-y-2"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success"/><p className="text-sm font-semibold">AI draft ready — human decision required</p></div>{(draft.criteria_results||[]).slice(0,6).map((x:any,i:number)=><div key={i} className="decision-card"><div className="flex justify-between gap-2"><p className="text-sm font-semibold">{x.criterion_code||'Criterion'}</p><StatusBadge status={x.recommendation||'review'}/></div><p className="text-xs text-muted-foreground mt-2">{x.rationale||'No rationale returned.'}</p><p className="text-[11px] mt-2"><b>Evidence:</b> {x.evidence_location||'Insufficient evidence'}</p></div>)}</div>}
     </div>
     <div className="action-panel"><p className="text-xs text-muted-foreground mb-2">AI is advisory. A qualified assessor must agree, modify or reject each criterion and sign the final decision.</p><Button className="w-full" disabled={!draft} onClick={()=>toast.info('Full criterion decision form is being wired to assessor_decisions.')}>Start human decision</Button></div>
    </>}
   </div>
  </div>
 </DashboardLayout>
}