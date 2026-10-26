import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {evidenceCitation} from '@/lib/assessment/marking';
type Props={text:string;criteria:{criterion_code:string}[];onCite?:(code:string,citation:string)=>void};
export default function EvidenceReview({text,criteria,onCite}:Props){
 const [start,setStart]=useState(1),[end,setEnd]=useState(1),[code,setCode]=useState(criteria[0]?.criterion_code||''),[notice,setNotice]=useState('');
 const lines=text.split('\n'),citation=evidenceCitation(text,start,end);
 return <section className="mt-4 min-w-0 space-y-3" aria-label="Submitted text review">
  <h3 className="font-semibold">Submitted evidence</h3>
  <p className="text-sm text-muted-foreground">Review the original text, then cite a line range against a criterion. For downloaded documents, enter the filename and page in the criterion’s evidence field.</p>
  <ol className="max-h-96 overflow-auto rounded-lg border bg-secondary/20 p-3" aria-label="Numbered submitted text">{lines.map((line,i)=><li key={i} className={`grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 rounded px-1 py-1 text-sm ${onCite&&i+1>=start&&i+1<=end?'bg-primary/10':''}`}><span className="select-none text-right text-muted-foreground" aria-label={`Line ${i+1}`}>{i+1}</span><span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{line||'\u00a0'}</span></li>)}</ol>
  {onCite&&criteria.length>0&&<><div className="grid gap-3 sm:grid-cols-[6rem_6rem_minmax(0,1fr)]">
   <label className="text-sm">From line<Input type="number" min={1} max={lines.length} value={start} onChange={e=>{setStart(Number(e.target.value));setNotice('');}}/></label>
   <label className="text-sm">To line<Input type="number" min={start} max={lines.length} value={end} onChange={e=>{setEnd(Number(e.target.value));setNotice('');}}/></label>
   <label className="min-w-0 text-sm">Cite for criterion<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={code} onChange={e=>setCode(e.target.value)}>{criteria.map(c=><option key={c.criterion_code}>{c.criterion_code}</option>)}</select></label>
  </div><Button variant="outline" disabled={!citation||!criteria.some(c=>c.criterion_code===code)} onClick={()=>{if(citation){onCite(code,citation);setNotice(`Evidence copied to ${code}. Add your own reasoning below.`);}}}>Use selected lines as evidence</Button>
  {!citation&&<p className="text-sm text-muted-foreground">Choose a valid range containing at least three characters and fitting the 900-character evidence limit.</p>}
  <p role="status" className="text-sm">{notice}</p></>}
 </section>;
}
