import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type Props={
 text:string;
 searchLabel?:string;
 listLabel?:string;
 selection?:{start:number;end:number};
 onSelectLine?:(line:number)=>void;
};

/** Search remains in memory and never changes the original evidence or a saved mark. */
export default function EvidenceTextReader({text,searchLabel='Find in submitted text',listLabel='Numbered submitted text',selection,onSelectLine}:Props){
 const [query,setQuery]=useState(''),[cursor,setCursor]=useState(0);
 const input=useRef<HTMLInputElement>(null),rows=useRef(new Map<number,HTMLLIElement>()),list=useRef<HTMLOListElement>(null);
 const id=useId();
 const lines=useMemo(()=>text.split('\n'),[text]);
 const needle=query.trim();
 // Escape literal input before matching; regex metacharacters never become patterns.
 const fragments=useMemo(()=>{
  if(!needle)return lines.map(value=>[value]);
  const escaped=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return lines.map(value=>value.split(new RegExp(`(${escaped})`,'giu')));
 },[lines,needle]);
 const matches=useMemo(()=>needle?fragments.flatMap((parts,i)=>parts.length>1?[i+1]:[]):[],[fragments,needle]);
 const current=Math.min(cursor,Math.max(0,matches.length-1)),line=matches[current];
 const matchSet=useMemo(()=>new Set(matches),[matches]);
 const clear=()=>{setQuery('');setCursor(0);input.current?.focus();};
 const move=(direction:number)=>{
  if(!matches.length)return;
  const next=(current+direction+matches.length)%matches.length;
  setCursor(next);
 };
 useEffect(()=>{
  const container=list.current,row=rows.current.get(line);
  if(!needle||!container||!row)return;
  // Scroll only the evidence pane, keeping page position and keyboard focus intact.
  const bounds=container.getBoundingClientRect(),target=row.getBoundingClientRect();
  if(target.top<bounds.top)container.scrollTop+=target.top-bounds.top;
  else if(target.bottom>bounds.bottom)container.scrollTop+=Math.min(target.top-bounds.top,target.bottom-bounds.bottom);
 },[line,needle,text]);
 return <div className="min-w-0 space-y-3">
  <label className="block text-sm font-medium" htmlFor={id}>{searchLabel}</label>
  <Input ref={input} id={id} type="search" maxLength={120} value={query} aria-describedby={`${id}-status`} placeholder="Find a word or phrase" onChange={e=>{setQuery(e.target.value);setCursor(0);}} onKeyDown={e=>{
   if(e.key==='Enter'){e.preventDefault();move(e.shiftKey?-1:1);}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();clear();}
  }}/>
  <div className="flex flex-wrap items-center gap-2">
   <Button variant="outline" disabled={!matches.length} onClick={()=>move(-1)}>Previous match</Button>
   <Button variant="outline" disabled={!matches.length} onClick={()=>move(1)}>Next match</Button>
   {query&&<Button variant="ghost" onClick={clear}>Clear evidence search</Button>}
   {onSelectLine&&matches.length>0&&<Button variant="outline" onClick={()=>onSelectLine(line)}>Select matching line for citation</Button>}
  </div>
  <p id={`${id}-status`} role="status" aria-atomic="true" className="text-sm text-muted-foreground">{needle?(matches.length?`Match ${current+1} of ${matches.length} matching lines · line ${line}`:'No matching lines. Try another word or clear the search.'):`${lines.length} source ${lines.length===1?'line':'lines'}. Search does not change the evidence.`}</p>
  <ol ref={list} tabIndex={0} className="max-h-96 overflow-auto rounded-lg border bg-secondary/20 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={listLabel}>
   {lines.map((value,i)=>{
    const number=i+1,matched=matchSet.has(number),selected=selection&&number>=selection.start&&number<=selection.end;
    return <li key={i} ref={el=>{if(el)rows.current.set(number,el);else rows.current.delete(number);}} aria-current={needle&&number===line?'true':undefined} className={`grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 rounded px-1 py-1 text-sm ${selected?'bg-primary/10':''} ${matched?'border-l-2 border-warning':''}`}>
     <span className="select-none text-right text-muted-foreground" aria-label={`Line ${number}`}>{number}</span><span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value?fragments[i].map((part,index)=>index%2?<mark key={index} className="rounded-sm bg-primary text-primary-foreground">{part}</mark>:part):'\u00a0'}</span>
    </li>;
   })}
  </ol>
 </div>;
}
