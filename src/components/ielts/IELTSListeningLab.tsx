import {useEffect,useMemo,useState} from 'react';
import {Headphones,Volume2,VolumeX,CheckCircle2,AlertCircle,RefreshCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {LISTENING_SCENARIOS,gradeListening,listeningSummary,type ListeningResults} from '@/lib/ieltsListeningDrills';

/** Device speech is a *practice aid*, not natural examiner audio. No external TTS service or personal data transfer. */
export default function IELTSListeningLab({available,onSave}:{
 available:boolean;onSave:(summary:string)=>Promise<void>;
}){
 const [scenarioIndex,setScenarioIndex]=useState(0);
 const [responses,setResponses]=useState<Record<string,string>>({});
 const [plays,setPlays]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [result,setResult]=useState<ListeningResults|null>(null);
 const [transcript,setTranscript]=useState(false);
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState(false);
 const [error,setError]=useState('');
 const scenario=LISTENING_SCENARIOS[scenarioIndex];
 const supported=typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
 const answered=useMemo(()=>Object.values(responses).filter(Boolean).length,[responses]);
 useEffect(()=>()=>{
   if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
 },[]);
 function stop(){
  if(supported)window.speechSynthesis.cancel();
  setPlaying(false);
 }
 function reset(next:number=scenarioIndex){
  stop();setScenarioIndex(next);setResponses({});setPlays(0);setResult(null);setTranscript(false);setSaved(false);setError('');
 }
 function play(){
  if(!supported||result||saving)return;
  setError('');
  try{
    window.speechSynthesis.cancel();
    const speech=new SpeechSynthesisUtterance(scenario.spokenScript);
    speech.lang='en-GB';speech.rate=0.91;speech.pitch=1;
    speech.onend=()=>setPlaying(false);
    speech.onerror=()=>{setPlaying(false);setError('Audio could not play on this device. Use the transcript study option below.');};
    window.speechSynthesis.speak(speech);
    setPlays(n=>n+1);setPlaying(true);
  }catch{
    setError('Device speech is unavailable. The transcript can still be used as an unscored study aid.');
  }
 }
 function finish(){
  stop();setResult(gradeListening(scenario,responses));
 }
 async function save(){
  if(!result||!available||saving||saved)return;
  if(!plays)return setError('Complete at least one audio play before saving a Listening practice result.');
  setSaving(true);setError('');
  try{await onSave(listeningSummary(scenario,result,plays));setSaved(true);}
  catch(e){setError(e instanceof Error?e.message:'Could not save. Please retry.');}
  finally{setSaving(false);}
 }
 return <section className="rounded-2xl border border-border p-4 sm:p-6 space-y-4" aria-label="Independent Listening practice">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs uppercase tracking-widest font-bold text-primary">Listening micro-practice</p><h4 className="text-lg font-semibold mt-1">{scenario.title}</h4>
   <p className="text-xs text-muted-foreground">{scenario.context} · {scenario.questions.length} original questions</p></div>
   <select className="rounded-lg border p-2 bg-background text-sm" aria-label="Choose listening scenario" value={scenarioIndex}
    onChange={e=>reset(Number(e.target.value))}>
     {LISTENING_SCENARIOS.map((s,i)=><option key={s.id} value={i}>{i+1}. {s.title}</option>)}
   </select>
  </div>
  <p className="text-sm text-muted-foreground">{scenario.instructions}</p>
  <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
   <div className="flex flex-wrap gap-2">
    <Button type="button" disabled={!supported||!!result||saving||playing} onClick={play}><Volume2 className="w-4 h-4 mr-2"/>{plays?'Replay original speech':'Play practice audio'}</Button>
    <Button type="button" variant="outline" disabled={!playing} onClick={stop}><VolumeX className="w-4 h-4 mr-2"/>Stop</Button>
   </div>
   <p className="text-xs text-muted-foreground">Your device generates synthetic speech from UniPathway’s original script. It is not a licensed IELTS Listening recording, does not mimic authentic exam accents, and can be replayed for learning.</p>
   {!supported&&<p role="alert" className="text-sm"><AlertCircle className="w-4 h-4 inline mr-2"/>Speech synthesis is unavailable on this device. This exercise can only be used as a transcript-reading study activity.</p>}
   {error&&<p role="alert" className="text-destructive text-sm">{error}</p>}
  </div>
  <div className="space-y-3">
   {scenario.questions.map((q,i)=>{
    const detail=result?.details.find(d=>d.id===q.id);
    return <fieldset className="border rounded-xl p-4 space-y-2" key={q.id}>
     <legend className="text-sm font-semibold px-1">Question {i+1}</legend><p className="text-sm">{q.question}</p>
     <div className="grid gap-2 sm:grid-cols-2">{q.choices.map(choice=>
       <label key={choice.value} className={'border rounded-lg px-3 py-2 cursor-pointer text-sm flex gap-2 items-center '+(responses[q.id]===choice.value?'border-primary bg-primary/5':'border-border')}>
         <input type="radio" className="accent-primary" name={'listen-'+scenario.id+'-'+q.id}
           disabled={!!result} checked={responses[q.id]===choice.value} onChange={()=>setResponses(v=>({...v,[q.id]:choice.value}))}/>
         {choice.label}
       </label>)}</div>
     {detail&&<p className="text-sm bg-secondary/50 p-3 rounded-lg" role="status">
       {detail.isCorrect?<CheckCircle2 className="w-4 h-4 text-success inline mr-2"/>:<AlertCircle className="w-4 h-4 inline mr-2"/>}
       {detail.isCorrect?'Correct. ':'Review: '}{detail.explanation}
     </p>}
    </fieldset>;
   })}
  </div>
  {result?<div className="rounded-xl border p-4 space-y-3 bg-secondary/50">
   <p role="status" className="font-semibold">Original practice accuracy: {result.correct}/{result.total} ({result.percent}%)</p>
   <p className="text-xs text-muted-foreground">This is a short formative exercise and cannot be converted to an IELTS band score. {plays?'Synthetic speech was played '+plays+' time(s).':'You reviewed text rather than playing audio.'}</p>
   <div className="flex flex-wrap gap-2">
    <Button type="button" disabled={!available||!plays||saving||saved} onClick={()=>void save()}>{saved?'Saved to your LMS':saving?'Saving…':'Save listening practice'}</Button>
    <Button type="button" variant="outline" onClick={()=>reset()}><RefreshCcw className="w-4 h-4 mr-2"/>Try again</Button>
    <Button type="button" variant="outline" onClick={()=>setTranscript(v=>!v)}>{transcript?'Hide':'Show'} original transcript</Button>
   </div>
   {!available&&<p className="text-xs text-muted-foreground">Create your IELTS study plan first to save tutor-visible practice.</p>}
  </div>:<div className="flex items-center gap-3">
   <p className="text-xs text-muted-foreground">{answered}/{scenario.questions.length} answered</p>
   <Button type="button" onClick={finish}>Check answers</Button>
  </div>}
  {(transcript||!supported)&&<div className="rounded-xl border border-dashed p-4 space-y-2">
    <p className="font-semibold text-sm">Original study transcript</p>
    <p className="text-sm leading-7 whitespace-pre-wrap">{scenario.spokenScript}</p>
    {!supported&&<p className="text-xs text-muted-foreground">Because audio could not play, this is a reading-assisted exercise, not an assessment of listening.</p>}
  </div>}
 </section>;
}
