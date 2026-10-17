import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {Headphones,Loader2,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {supabase} from '@/integrations/supabase/client';
import {EMPTY_SPEAKING_BANDS,SPEAKING_BAND_CATEGORIES,completeSpeakingBands,type SpeakingBands} from '@/lib/ieltsSpeaking';
import type {IeltsTrack} from '@/lib/ieltsCurriculum';

const db:SupabaseClient=supabase;
type Row={
 id:string;student_id:string;track:IeltsTrack;prompt_key:string;storage_path:string;duration_seconds:number;
 teacher_feedback:string|null;fluency_band:number|null;lexical_band:number|null;grammar_band:number|null;pronunciation_band:number|null;
 reviewed_at:string|null;created_at:string;
};
const choices=Array.from({length:19},(_,i)=>i/2);
export default function IELTSSpeakingTutorQueue({tenant}:{tenant:string}){
 const [rows,setRows]=useState<Row[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<Row|null>(null);
 const [audioUrl,setAudioUrl]=useState('');
 const [feedback,setFeedback]=useState('');
 const [scores,setScores]=useState<SpeakingBands>(EMPTY_SPEAKING_BANDS);
 const [played,setPlayed]=useState(false);
 const estimate=useMemo(()=>completeSpeakingBands(scores),[scores]);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  const result=await db.from('ielts_speaking_recordings')
   .select('id,student_id,track,prompt_key,storage_path,duration_seconds,teacher_feedback,fluency_band,lexical_band,grammar_band,pronunciation_band,reviewed_at,created_at')
   .eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(100);
  if(result.error){setError('Tutor speaking evidence could not be loaded. Check database and role permissions.');setLoading(false);return;}
  const loaded=(result.data||[]) as Row[];setRows(loaded);
  const ids=[...new Set(loaded.map(r=>r.student_id))];
  if(ids.length){
   const p=await db.from('profiles').select('user_id,full_name').eq('tenant_id',tenant).in('user_id',ids);
   if(!p.error)setNames(Object.fromEntries((p.data||[]).map(row=>[row.user_id,row.full_name])));
  }
  setLoading(false);
 },[tenant]);
 useEffect(()=>{void load();},[load]);
 async function choose(row:Row){
  if(busy)return;
  setSelected(row);setAudioUrl('');setPlayed(false);setError('');
  setFeedback(row.teacher_feedback||'');
  setScores({
   fluency_band:row.fluency_band,lexical_band:row.lexical_band,
   grammar_band:row.grammar_band,pronunciation_band:row.pronunciation_band
  });
  const r=await db.storage.from('ielts-speaking').createSignedUrl(row.storage_path,120);
  if(r.error||!r.data?.signedUrl){setError('The private audio is currently unavailable. Do not score a recording you cannot listen to.');return;}
  setAudioUrl(r.data.signedUrl);
 }
 async function review(){
  if(!selected||busy)return;
  if(!audioUrl||!played){setError('Listen to the student audio before assessing speaking.');return;}
  if(feedback.trim().length<10){setError('Please include specific feedback of at least ten characters.');return;}
  const partial=Object.values(scores).filter(x=>x!==null).length;
  if(partial!==0&&partial!==4){setError('Complete all four criteria or leave all four unscored.');return;}
  if(partial===4&&estimate===null){setError('Each criterion must use a valid half-band step.');return;}
  setBusy(true);setError('');
  const update=await db.from('ielts_speaking_recordings')
   .update({...scores,teacher_feedback:feedback.trim()}).eq('id',selected.id).eq('tenant_id',tenant);
  setBusy(false);
  if(update.error){setError(update.error.message);return;}
  setSelected(null);setAudioUrl('');setPlayed(false);await load();
 }
 return <section className="rounded-xl border p-4 sm:p-6 space-y-4" aria-label="Speaking recording tutor queue">
  <div className="flex gap-3"><Headphones className="w-5 h-5 text-primary shrink-0"/>
   <div><h3 className="font-semibold">Speaking audio review</h3>
    <p className="text-sm text-muted-foreground">Private learner recordings, with human-only feedback. Listen before assessing. Ratings are optional tutor estimates, never official IELTS scores.</p>
   </div></div>
  {loading?<p className="text-sm" role="status">Loading speaking recordings…</p>:
   rows.length?<div className="space-y-2">{rows.map(r=><button type="button" key={r.id} onClick={()=>void choose(r)} disabled={busy}
    className={'w-full text-left border rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-secondary/50 '+(selected?.id===r.id?'border-primary':'border-border')}>
    <div><p className="font-medium text-sm">{names[r.student_id]||'Student '+r.student_id.slice(0,8)}</p>
    <p className="text-xs text-muted-foreground">{r.prompt_key.toUpperCase()} · {r.duration_seconds}s · {r.track} · {new Date(r.created_at).toLocaleDateString()}</p></div>
    <span className="text-xs">{r.reviewed_at?'Reviewed':'Awaiting review'}</span>
   </button>)}</div>:
   <p className="text-sm text-muted-foreground">No saved speaking recordings have been submitted.</p>}
  {selected&&<div className="rounded-xl bg-secondary/60 p-4 space-y-4">
    <h4 className="font-semibold">Human review — {names[selected.student_id]||'student recording'}</h4>
    {audioUrl?<div>
      <audio key={audioUrl} controls src={audioUrl} className="w-full" onPlay={()=>setPlayed(true)} aria-label="Listen to student Speaking evidence"/>
      <p className="text-xs text-muted-foreground mt-2">Signed playback access expires shortly. Select the recording again if it expires.</p>
    </div>:<p className="text-sm">Private audio could not be loaded yet; assessment is disabled.</p>}
    <div className="grid sm:grid-cols-2 gap-3">
     {SPEAKING_BAND_CATEGORIES.map(cat=><label key={cat.key} className="text-xs font-semibold">
       {cat.label}<select className="block w-full mt-1 rounded-md border bg-background p-2" value={scores[cat.key]===null?'':String(scores[cat.key])}
        onChange={e=>setScores(prev=>({...prev,[cat.key]:e.target.value===''?null:Number(e.target.value)}))}>
         <option value="">Feedback only — no numerical rating</option>
         {choices.map(n=><option key={n} value={String(n)}>{n.toFixed(1)}</option>)}
       </select>
     </label>)}
    </div>
    <p className="text-xs text-muted-foreground">{estimate===null?'Give feedback without numerical estimates, or complete all four criteria.':'Formative four-criterion average: '+estimate.toFixed(1)+' (not an IELTS overall band)'}</p>
    <label className="block text-sm font-semibold">What to improve next
      <Textarea value={feedback} onChange={e=>setFeedback(e.target.value)} maxLength={5000} rows={4} className="mt-2" placeholder="Assess observed pronunciation, fluency, language and grammar. Suggest concrete exercises."/>
    </label>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy||!audioUrl||!played} onClick={()=>void review()}><ShieldCheck className="w-4 h-4 mr-2"/> {busy?'Saving…':'Save observed feedback'}</Button>
      <Button type="button" variant="outline" onClick={()=>{setSelected(null);setAudioUrl('');setPlayed(false);}}>Close review</Button>
    </div>
  </div>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {rows.length>=100&&<p className="text-xs text-muted-foreground">Showing the most recent 100 recordings in this centre.</p>}
  {!loading&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void load()}>{busy?<Loader2 className="w-4 h-4 mr-2 animate-spin"/>:null}Refresh speaking queue</Button>}
 </section>;
}
