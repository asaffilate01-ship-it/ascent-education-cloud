import {useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {CheckCircle2,Clock3,CircleDashed,ShieldAlert} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import type {IeltsTrack} from '@/lib/ieltsCurriculum';
import {buildIeltsEvidenceCoverage,type ReadinessSubmission,type ReadinessSpeaking} from '@/lib/ieltsReadiness';

const db:SupabaseClient=supabase;
export default function IELTSReadinessPanel({tenant,student,track,submissions,onSelectWeek}:{
 tenant:string;student:string;track:IeltsTrack;
 submissions:ReadinessSubmission[];
 onSelectWeek:(week:number)=>void;
}){
 const [speaking,setSpeaking]=useState<ReadinessSpeaking[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setLoading(true);setError('');setSpeaking([]);
  db.from('ielts_speaking_recordings').select('reviewed_at,teacher_feedback')
   .eq('tenant_id',tenant).eq('student_id',student).eq('track',track)
   .order('created_at',{ascending:false}).limit(30).then(({data,error:queryError})=>{
      if(cancelled)return;
      if(queryError)setError('Speaking evidence is not yet available for this centre. This summary may be incomplete.');
      else setSpeaking((data||[]) as ReadinessSpeaking[]);
      setLoading(false);
   });
  return ()=>{cancelled=true;};
 },[tenant,student,track,version]);
 const summary=useMemo(()=>buildIeltsEvidenceCoverage(submissions,speaking),[submissions,speaking]);
 const statuses={
  reviewed:{label:'Tutor-reviewed',Icon:CheckCircle2,className:'text-success'},
  submitted:{label:'Recorded',Icon:CheckCircle2,className:'text-success'},
  awaiting_tutor:{label:'Awaiting tutor',Icon:Clock3,className:'text-amber-700 dark:text-amber-300'},
  not_started:{label:'Not started',Icon:CircleDashed,className:'text-muted-foreground'}
 };
 return <section className="surface-card p-5 space-y-4" aria-label="IELTS practice evidence overview">
   <div className="flex gap-3 items-start"><ShieldAlert className="w-5 h-5 text-primary shrink-0"/>
    <div><h3 className="font-semibold text-lg">Exam preparation evidence</h3>
     <p className="text-sm text-muted-foreground">Check whether you have practised all four skills and received human feedback. This is an evidence checklist, not a prediction of your IELTS result or permission to book a test.</p>
    </div>
   </div>
   <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
     <div className="flex items-center justify-between gap-3 flex-wrap"><p className="font-semibold">{summary.reviewedCount} of {summary.total} activities documented or reviewed</p><p className="text-sm font-bold">{summary.coveragePercent}% evidence coverage</p></div>
     <div className="w-full h-2.5 bg-background rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width:summary.coveragePercent+'%'}}/></div>
     <p className="text-xs text-muted-foreground">{summary.engagedCount} activities engaged with, including those awaiting tutor feedback.</p>
   </div>
   <div className="grid gap-2 sm:grid-cols-2">
    {summary.items.map(item=>{
      const status=statuses[item.status],Icon=status.Icon;
      return <button type="button" key={item.key} onClick={()=>onSelectWeek(item.week)}
       className="rounded-lg border p-3 text-left hover:bg-secondary/40 flex gap-3 items-start">
       <Icon className={'w-5 h-5 mt-0.5 shrink-0 '+status.className}/>
       <span className="space-y-1"><span className="text-sm font-semibold block">Week {item.week}: {item.label}</span>
       <span className="text-xs block text-muted-foreground">{status.label} · {item.detail}</span></span>
      </button>;
    })}
   </div>
   {summary.nextAction&&<Button type="button" variant="outline" onClick={()=>onSelectWeek(summary.nextAction!.week)}>
     Continue Week {summary.nextAction.week}: {summary.nextAction.label}
   </Button>}
   {loading&&<p role="status" className="text-xs text-muted-foreground">Checking private speaking feedback…</p>}
   {error&&<div className="flex gap-3 items-center"><p role="alert" className="text-xs text-destructive flex-1">{error}</p><Button type="button" size="sm" variant="outline" onClick={()=>setVersion(v=>v+1)}>Retry</Button></div>}
   <p className="text-xs text-muted-foreground">Your university decides its own minimum overall and individual component bands. Confirm the correct IELTS test type and the receiving institution’s current requirements before booking an official exam.</p>
 </section>;
}
