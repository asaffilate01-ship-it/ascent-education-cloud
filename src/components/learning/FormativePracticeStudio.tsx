import {useState,useRef} from 'react';
import {ArrowRight,BookOpen,CheckCircle2,RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {practiceSizes,practiceSelection,practiceResults,type PracticeSize,type PracticeAnswer} from '@/lib/learning/formativePractice';
import type {FormativeQuestion} from '@/lib/learning/formativeQuestions';

export default function FormativePracticeStudio({matches}:{matches:readonly FormativeQuestion[]}){
 const [size,setSize]=useState<PracticeSize>(10);
 const [session,setSession]=useState<FormativeQuestion[]>([]);
 const [answers,setAnswers]=useState<PracticeAnswer[]>([]);
 const [choice,setChoice]=useState('');
 const [index,setIndex]=useState(0);
 const [review,setReview]=useState(false);
 const [finished,setFinished]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const results=practiceResults(session,answers);
 const question=session[index];
 const selected=answers.find(a=>a.questionId===question?.id);
 function begin(items:FormativeQuestion[]){
  setSession(items);setAnswers([]);setChoice('');setIndex(0);setReview(false);setFinished(false);
 }
 function next(){
  if(!selected)return;
  setChoice('');
  if(index+1>=session.length)setFinished(true);else setIndex(i=>i+1);
  requestAnimationFrame(()=>heading.current?.focus());
 }
 function stop(){
  setSession([]);setAnswers([]);setChoice('');setIndex(0);setReview(false);setFinished(false);
 }
 return <section className="min-w-0 rounded-xl border bg-background p-4 sm:p-5" aria-label="Focused practice preview">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="min-w-0"><h3 ref={heading} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"><BookOpen aria-hidden="true" className="size-5 shrink-0"/>Focused practice</h3><p className="mt-1 text-sm text-muted-foreground">Review a short selection of the matching draft questions, one at a time.</p></div>
   {session.length>0&&<Button variant="outline" type="button" onClick={()=>{if(finished||window.confirm('End this temporary practice session?'))stop();}}>End practice</Button>}
  </div>
  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Staff review preview only. Responses and practice totals are temporary, not saved grades, official assessment outcomes or evidence of mastery. The session is fixed when started, even if library filters change.</p>
  {!session.length?<div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Question count<select className="mt-1 block min-h-11 rounded-md border bg-background px-3" value={size} onChange={e=>setSize(Number(e.target.value) as PracticeSize)}>{practiceSizes.map(n=><option key={n} value={n}>{n} questions</option>)}</select></label><Button type="button" className="min-h-11" disabled={!matches.length} onClick={()=>begin(practiceSelection(matches,size))}>Start practice ({Math.min(matches.length,size)} available)</Button></div>:<>
   <div className="mt-4 space-y-2" aria-label="Practice progress">
    <p role="status" className="text-sm font-medium">{results.answered} of {results.total} answered{finished?' · Preview complete':''}</p>
    <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={results.total} aria-valuenow={results.answered} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:results.answered/results.total*100+'%'}}/></div>
   </div>
   {finished?<div className="mt-4 rounded-xl border p-4 space-y-4">
    <h4 className="font-semibold">Session review</h4>
    <p className="text-2xl font-bold tabular-nums">{results.correct} / {results.total} correct</p>
    <p className="text-sm text-muted-foreground">Review the worked explanations. These results describe only this preview.</p>
    <div className="flex flex-wrap gap-2">
     {results.missed.length>0&&<Button type="button" onClick={()=>setReview(v=>!v)} aria-expanded={review}>{review?'Hide missed questions':'Review missed questions ('+results.missed.length+')'}</Button>}
     <Button type="button" variant="outline" onClick={()=>begin(session)}><RotateCcw aria-hidden="true" className="mr-2 size-4"/>Retry this set</Button>
     {results.missed.length>0&&<Button type="button" variant="outline" onClick={()=>begin(results.missed)}>Practise missed questions</Button>}
    </div>
    {review&&<ol className="space-y-3">{results.missed.map(q=><li key={q.id} className="rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><p className="font-medium">{q.question}</p><p className="mt-2">Your answer: {answers.find(a=>a.questionId===q.id)?.choice}</p><p className="mt-1"><strong>Correct answer:</strong> {q.answer}</p><p className="mt-1 text-muted-foreground">{q.explanation}</p></li>)}</ol>}
   </div>:question&&<div className="mt-4 min-w-0 space-y-3 rounded-xl border p-4 [overflow-wrap:anywhere]">
    <p className="text-xs font-medium text-muted-foreground">Question {index+1} of {session.length} · {question.subject} · {question.topic}</p>
    <fieldset disabled={!!selected} className="min-w-0 space-y-2"><legend className="mb-3 font-semibold">{question.question}</legend>{question.options.map((option,i)=><label key={option} className="flex min-h-11 min-w-0 items-start gap-3 rounded-lg border p-3 text-sm"><input className="mt-1 shrink-0 accent-primary" type="radio" name="focused-practice-choice" checked={(selected?.choice??choice)===option} onChange={()=>setChoice(option)}/><span>{String.fromCharCode(65+i)}. {option}</span></label>)}</fieldset>
    {!selected?<Button type="button" disabled={!choice} onClick={()=>setAnswers(old=>old.some(a=>a.questionId===question.id)?old:[...old,{questionId:question.id,choice}])}>Check practice answer</Button>:<>
     <div role="status" className="rounded-lg border p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 aria-hidden="true" className="size-4"/>{selected.choice===question.answer?'Correct':'Review the explanation'}</p><p className="mt-2"><strong>Answer:</strong> {question.answer}</p><p className="mt-1">{question.explanation}</p></div>
     <Button type="button" onClick={next}>{index+1===session.length?'Finish practice':'Next practice question'}<ArrowRight aria-hidden="true" className="ml-2 size-4"/></Button>
    </>}
   </div>}
  </>}
 </section>;
}
