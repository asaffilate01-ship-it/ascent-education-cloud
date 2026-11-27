import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {FORMATIVE_QUESTIONS} from '@/lib/learning/formativeQuestions';
import {draftProviders,formativeDraftPrompt,reviewFormativeDrafts,MAX_DRAFT_INPUT,type DraftReview} from '@/lib/learning/formativeDraftReview';

export default function FormativeDraftIntake({subject}:{subject:string}){
 const [provider,setProvider]=useState<string>('Other / human-authored');
 const [raw,setRaw]=useState('');
 const [result,setResult]=useState<DraftReview|null>(null);
 const [notice,setNotice]=useState('');
 const [selected,setSelected]=useState(0);
 const prompt=formativeDraftPrompt(subject);
 const item=result?.items[selected];
 return <section className="min-w-0 space-y-4 rounded-xl border bg-background p-4 sm:p-5" aria-label="AI and author draft review">
  <div><h3 className="text-lg font-semibold">AI and author draft review</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Prepare structured question proposals in a trusted authoring tool, then validate them here. This local preview does not connect to a model, transmit learner data, publish questions or save assessment records.</p></div>
  <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">Show question authoring prompt</summary><p className="mt-3 break-words text-sm">{prompt}</p><Button type="button" variant="outline" className="mt-3" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setNotice('Authoring prompt copied.');}catch{setNotice('Copy is unavailable. Select the prompt text manually.');}}}>Copy authoring prompt</Button></details>
  <label className="block text-sm font-medium">Draft source (self-reported)<select className="mt-1 block min-h-11 w-full rounded-md border bg-background px-3 sm:max-w-xs" value={provider} onChange={e=>{setProvider(e.target.value);setResult(null);setNotice('');}}>{draftProviders.map(p=><option key={p}>{p}</option>)}</select></label>
  <label className="block text-sm font-medium">Proposed questions JSON<textarea className="mt-1 block min-w-0 w-full rounded-lg border bg-background p-3 font-mono text-sm" rows={7} maxLength={MAX_DRAFT_INPUT} value={raw} onChange={e=>{setRaw(e.target.value);setResult(null);setNotice('');}} placeholder="Paste an array of 1–20 question objects"/></label>
  <p className="text-xs text-muted-foreground">Do not paste names, contact details, identity documents, secure examination questions or provider secrets. Input and results disappear when this review closes.</p>
  <div className="flex flex-wrap gap-2"><Button type="button" disabled={!raw.trim()} onClick={()=>{setResult(reviewFormativeDrafts(raw,FORMATIVE_QUESTIONS));setSelected(0);setNotice('');}}>Validate draft batch</Button><Button type="button" variant="outline" onClick={()=>{setRaw('');setResult(null);setSelected(0);setNotice('Draft cleared.');}}>Clear draft</Button></div>
  {notice&&<p role="status" className="text-sm">{notice}</p>}
  {result&&<div className="space-y-3 rounded-lg border p-4">
   <p role="status" className="font-semibold">{result.items.length} structurally valid · {result.issues.length} issues</p><p className="text-xs text-muted-foreground">Source label: {provider}. Format validation does not establish accuracy, syllabus fit, originality, copyright clearance or provider identity. All candidates require independent academic review.</p>
   {!!result.issues.length&&<ul className="space-y-2 text-sm">{result.issues.map((issue,i)=><li key={i}><strong>{issue.row?'Row '+issue.row:'Batch'}:</strong> {issue.message}</li>)}</ul>}
   {!!item&&<div className="space-y-3"><label className="block text-sm font-medium">Preview structurally valid draft<select value={selected} onChange={e=>setSelected(Number(e.target.value))} className="mt-1 block min-h-11 w-full min-w-0 rounded-md border bg-background px-3">{result.items.map((q,i)=><option key={i} value={i}>{i+1}. {q.subject} · {q.topic}</option>)}</select></label><div className="min-w-0 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><p className="font-semibold">{item.question}</p><ul className="mt-2 space-y-1">{item.options.map(o=><li key={o}>{o}</li>)}</ul><p className="mt-3"><strong>Proposed answer:</strong> {item.answer}</p><p className="mt-1">{item.explanation}</p><p className="mt-2 text-xs text-muted-foreground">{item.scope} · Review required</p></div></div>}
  </div>}
 </section>;
}
