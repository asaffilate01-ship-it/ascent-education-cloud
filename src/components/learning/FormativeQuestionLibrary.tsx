import {useMemo,useState} from 'react';
import {BookOpen,ChevronLeft,ChevronRight,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import FormativePracticeStudio from './FormativePracticeStudio';
import {FORMATIVE_QUESTIONS} from '@/lib/learning/formativeQuestions';
import {FORMATIVE_SUBJECTS,filterFormativeQuestions,formativeFeedback} from '@/lib/learning/formativeQuestionSearch';
const pageSize=6;
export default function FormativeQuestionLibrary(){
 const [mode,setMode]=useState<'browse'|'practice'>('browse');
 const [open,setOpen]=useState(false),[subject,setSubject]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 const matches=useMemo(()=>filterFormativeQuestions(subject,query),[subject,query]);
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.min(page,pages-1);
 return <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6" aria-label="Formative question library">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen aria-hidden="true" className="size-5 shrink-0"/>Formative question library</h2><p className="mt-1 text-sm text-muted-foreground">{FORMATIVE_QUESTIONS.length} original draft questions · {FORMATIVE_SUBJECTS.length} subject areas · worked explanations</p></div><Button type="button" variant="outline" aria-expanded={open} className="h-auto min-h-11 max-w-full whitespace-normal" onClick={()=>setOpen(v=>!v)}>{open?'Hide question library':'Explore question library'}</Button></div>
  <p className="text-sm leading-relaxed text-muted-foreground">Preview independent practice for lesson preparation. These are review drafts, not official board questions, published course material or secure examination items. Confirm suitability and the current syllabus before using them. Do not reuse bundled practice answers in timed or graded assessments.</p>
  {open&&<>
   <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-1" role="group" aria-label="Question library mode">{(['browse','practice'] as const).map(value=><Button key={value} type="button" variant={mode===value?'default':'ghost'} aria-pressed={mode===value} className="h-auto min-h-11 min-w-0 whitespace-normal" onClick={()=>{if(mode==='practice'&&value==='browse'&&!window.confirm('Leave focused practice? Temporary responses will be cleared.'))return;setMode(value);}}>{value==='browse'?'Browse and review':'Focused practice'}</Button>)}</div>
   <div className="grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-medium">Practice subject<select value={subject} onChange={e=>{setSubject(e.target.value);setPage(0);}} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"><option value="all">All subjects</option>{FORMATIVE_SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label>
   <label className="block min-w-0 text-sm font-medium">Search practice questions<input type="search" maxLength={120} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base" placeholder="Subject, topic or question"/></label></div>
   <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm text-muted-foreground">{matches.length} matching draft questions</p>{(subject!=='all'||query)&&<Button variant="outline" type="button" onClick={()=>{setSubject('all');setQuery('');setPage(0);}}>Clear question filters</Button>}</div>
   {mode==='practice'?<FormativePracticeStudio matches={matches}/>:<>
   {!matches.length?<p className="rounded-lg border p-3 text-sm">No practice questions match these filters.</p>:<div className="grid gap-3 xl:grid-cols-2">{matches.slice(current*pageSize,current*pageSize+pageSize).map(q=><Question key={q.id} question={q}/>)}</div>}
   {pages>1&&<nav aria-label="Practice question pages" className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft aria-hidden="true" className="size-4"/>Previous questions</Button><span className="text-sm">Page {current+1} of {pages}</span><Button type="button" variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next questions<ChevronRight aria-hidden="true" className="size-4"/></Button></nav>}
   </>}
  </>}
 </section>;
}
function Question({question:q}:{question:typeof FORMATIVE_QUESTIONS[number]}){
 const [choice,setChoice]=useState(''),[revealed,setRevealed]=useState(false);
 const feedback=revealed?formativeFeedback(q,choice):null;
 return <article className="min-w-0 space-y-3 rounded-lg border p-3 sm:p-4 [overflow-wrap:anywhere]"><p className="text-xs font-medium text-muted-foreground">{q.id} · {q.topic} · v{q.revision}</p><p className="text-xs text-muted-foreground">{q.subject} · {q.scope}</p><fieldset className="min-w-0 space-y-2"><legend className="mb-3 text-sm font-semibold">{q.question}</legend>{q.options.map((o,i)=><label key={o} className="flex min-h-11 min-w-0 items-start gap-2 rounded-lg border p-2 text-sm"><input className="mt-1 shrink-0 accent-primary" type="radio" name={q.id} checked={choice===o} onChange={()=>{setChoice(o);setRevealed(false);}}/><span className="min-w-0 flex-1">{String.fromCharCode(65+i)}. {o}</span></label>)}</fieldset>
 <div className="flex flex-wrap gap-2"><Button type="button" disabled={!choice} onClick={()=>setRevealed(true)}>Check answer</Button><Button type="button" variant="outline" onClick={()=>{setChoice('');setRevealed(false);}}>Reset</Button></div>
 {feedback&&<div role="status" className="space-y-2 rounded-lg border p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0"/>{feedback.correct?'Correct':'Review the explanation'}</p><p><strong>Answer:</strong> {feedback.answer}</p><p>{feedback.explanation}</p></div>}
 </article>;
}
