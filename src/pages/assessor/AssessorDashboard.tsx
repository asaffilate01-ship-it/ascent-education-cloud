import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AssessorDashboard() {
  const [attempts,setAttempts]=useState<any[]>([]);
  const [decisions,setDecisions]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const load=async()=>{setLoading(true);const [a,d]=await Promise.all([
    supabase.from('submission_attempts').select('*').order('submitted_at',{ascending:false}).limit(100),
    supabase.from('assessor_decisions').select('*').order('decided_at',{ascending:false}).limit(100)
  ]);setAttempts(a.data||[]);setDecisions(d.data||[]);setLoading(false)};
  useEffect(()=>{load()},[]);
  const decided=new Set(decisions.map(d=>d.submission_attempt_id));
  const queue=attempts.filter(a=>!decided.has(a.id)&&['ai_drafted','assessor_review','integrity_checked'].includes(a.status));
  const resubs=attempts.filter(a=>a.status==='resubmission_required');
  return <DashboardLayout title="Assessor Workspace" subtitle="Human-controlled assessment with AI decision support">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="To Assess" value={queue.length} icon={ClipboardCheck}/>
      <StatCard label="Resubmission Required" value={resubs.length} icon={RefreshCw}/>
      <StatCard label="AI Drafts Ready" value={attempts.filter(a=>a.status==='ai_drafted').length} icon={Sparkles}/>
      <StatCard label="Late Attempts" value={attempts.filter(a=>a.is_late).length} icon={AlertTriangle}/>
    </div>
    <Card><CardHeader><CardTitle className="text-sm">Assessment Queue</CardTitle></CardHeader><CardContent className="space-y-2">
      {loading?<p className="text-sm text-muted-foreground">Loading…</p>:queue.length===0?<p className="text-sm text-muted-foreground">No assessment work currently assigned.</p>:queue.map(a=><div key={a.id} className="border rounded-lg p-4 flex items-center justify-between">
        <div><p className="font-medium text-sm">Submission {a.submission_id.slice(0,8)}</p><p className="text-xs text-muted-foreground">Attempt {a.attempt_number} · {new Date(a.submitted_at).toLocaleString('en-GB')}</p></div>
        <div className="flex gap-2 items-center"><StatusBadge status={a.status}/>{a.is_late&&<StatusBadge status="Late" variant="warning"/>}<Button size="sm" onClick={()=>toast.info('Criterion-by-criterion review panel is the next wiring step.')}>Review</Button></div>
      </div>)}
    </CardContent></Card>
  </DashboardLayout>
}