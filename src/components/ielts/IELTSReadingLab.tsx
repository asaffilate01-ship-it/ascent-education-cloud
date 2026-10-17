import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IeltsTrack } from '@/lib/ieltsCurriculum';
import {
 IELTS_READING_DRILLS, gradeReadingDrill, readingAttemptSummary, type ReadingAnswer, type ReadingResult,
} from '@/lib/ieltsReadingDrills';

export default function IELTSReadingLab({track,available,onSave}:{
 track:IeltsTrack;
 available:boolean;
 onSave:(summary:string)=>Promise<void>;
}){
 const drill=IELTS_READING_DRILLS[track];
 const [answers,setAnswers]=useState<ReadingAnswer>({});
 const [startedAt,setStartedAt]=useState<number|null>(null);
 const [now,setNow]=useState(Date.now());
 const [finished,setFinished]=useState<ReadingResult|null>(null);
 const [duration,setDuration]=useState(0);
 const [busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false);
 const [saveError,setSaveError]=useState('');
 const answered=useMemo(()=>Object.values(answers).filter(Boolean).length,[answers]);
 useEffect(()=>{
   setAnswers({});setStartedAt(null);setFinished(null);setDuration(0);setBusy(false);setSaved(false);setSaveError('');
 },[track]);
 useEffect(()=>{
   if(startedAt===null||finished!==null)return;
   const timer=window.setInterval(()=>setNow(Date.now()),1000);
   return ()=>window.clearInterval(timer);
 },[startedAt,finished]);
 const seconds=startedAt===null?0:finished!==null?duration:Math.max(0,Math.floor((now-startedAt)/1000));
 const remaining=Math.max(0,12*60-seconds);
 function finish(){
   if(!startedAt)return;
   setDuration(Math.max(0,Math.floor((Date.now()-startedAt)/1000)));
   setFinished(gradeReadingDrill(drill,answers));
 }
 async function save(){
  if(!finished||!available||saved||busy)return;
  setBusy(true);setSaveError('');
  try{
    await onSave(readingAttemptSummary(drill,finished,duration));
    setSaved(true);
  }catch(e){
    setSaveError(e instanceof Error?e.message:'Could not save practice; retry when connected.');
  }finally{setBusy(false);}
 }
 function reset(){
  if(busy)return;
  setAnswers({});setStartedAt(null);setFinished(null);setDuration(0);setSaved(false);setSaveError('');
 }
 return <section className="rounded-2xl border border-border p-4 sm:p-6 space-y-5" aria-label="Original IELTS reading practice">
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <div>
      <p className="text-xs uppercase font-semibold tracking-wide text-primary">Self-check reading lab</p>
      <h4 className="text-lg font-semibold mt-1">{drill.title}</h4>
      <p className="text-xs text-muted-foreground">{drill.level} · {drill.questions.length} mini questions · not a full IELTS paper</p>
    </div>
    <div className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-sm" role="timer">
      <Clock3 className="h-4 w-4" />
      {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}
    </div>
  </div>
  <p className="text-sm text-muted-foreground leading-6">{drill.instructions}</p>
  {!startedAt ? <div className="rounded-xl bg-secondary/60 p-5 space-y-3">
    <p className="text-sm">Start the practice timer to reveal the passage and questions. You can answer every question on this page. A correct-answer explanation appears after you finish.</p>
    <Button type="button" onClick={()=>{setStartedAt(Date.now());setNow(Date.now());}}>Start reading practice</Button>
  </div> : <>
    <div className="rounded-xl bg-secondary/60 p-4 sm:p-5 space-y-4">
      <h5 className="font-semibold text-sm">Reading passage</h5>
      {drill.passage.map((p,i)=><p key={i} className="text-sm leading-7">{p}</p>)}
    </div>
    <div className="space-y-5">
      {drill.questions.map((q,index)=>{
        const result=finished?.details.find(d=>d.id===q.id);
        return <fieldset key={q.id} className="rounded-xl border border-border/80 p-4 space-y-3">
          <legend className="text-sm font-semibold px-1">Question {index+1}</legend>
          <p className="text-sm font-medium">{q.prompt}</p>
          <div className="grid gap-2">
            {q.choices.map(choice=><label key={choice.value} className={'flex items-center gap-2 cursor-pointer rounded-lg p-2.5 border text-sm '+(answers[q.id]===choice.value?'border-primary bg-primary/5':'border-border hover:bg-secondary/40')}>
              <input type="radio" name={'reading-'+track+'-'+q.id} value={choice.value} checked={answers[q.id]===choice.value} disabled={!!finished} onChange={()=>setAnswers(prev=>({...prev,[q.id]:choice.value}))} className="accent-primary"/>
              <span>{choice.label}</span>
            </label>)}
          </div>
          {result&&<div role="status" className={'text-sm rounded-md p-3 '+(result.isCorrect?'bg-success/10':'bg-secondary')}>
            <p className="font-semibold flex items-center gap-2">{result.isCorrect?<CheckCircle2 className="w-4 h-4 text-success"/>:<AlertTriangle className="w-4 h-4"/>}{result.isCorrect?'Correct':'Review this answer'}</p>
            <p className="mt-1">{result.explanation}</p>
          </div>}
        </fieldset>;
      })}
    </div>
    {finished?<div className="rounded-xl bg-secondary/50 border p-4 space-y-3" role="status">
      <h5 className="font-bold text-lg">Practice result: {finished.correct}/{finished.total}</h5>
      <p className="text-sm">Accuracy: {finished.percent}% · {Math.round(duration/60)} minutes elapsed. This is not an IELTS band score or an official exam result.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!available||busy||saved} onClick={()=>void save()}>{saved?'Saved to your LMS':busy?'Saving…':'Save practice to LMS'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={reset}><RefreshCcw className="w-4 h-4 mr-2"/> Try again</Button>
      </div>
      {!available&&<p className="text-xs text-muted-foreground">Create your student study plan above to save the result.</p>}
      {saveError&&<p role="alert" className="text-destructive text-sm">{saveError}</p>}
    </div>:<div className="flex gap-3 items-center flex-wrap">
      <p className="text-xs text-muted-foreground">{answered} of {drill.questions.length} answered</p>
      <Button type="button" onClick={finish}>Finish & review answers</Button>
    </div>}
  </>}
 </section>;
}
