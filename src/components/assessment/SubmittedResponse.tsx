import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {db} from '@/lib/db';
/** Load original evidence only when requested; RLS rechecks access on every read. */
export default function SubmittedResponse({attempt,student,tenant}:{attempt:string;student:string;tenant:string}) {
  const [response,setResponse]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const generation=useRef(0);
  useEffect(()=>{const ref=generation;return()=>{ref.current++;};},[]);
  async function read(){
    const token=++generation.current;setBusy(true);setError('');setResponse(null);
    try{
      const r=await db.from('unipathway_assessment_attempts').select('evidence_text').eq('id',attempt).eq('student_id',student).eq('tenant_id',tenant).maybeSingle();
      if(r.error||typeof r.data?.evidence_text!=='string')throw Error('Unavailable');
      if(token===generation.current)setResponse(r.data.evidence_text);
    }catch{if(token===generation.current)setError('Your submitted response could not be verified. Retry or contact your centre.');}
    finally{if(token===generation.current)setBusy(false);}
  }
  return <div className="mt-3"><Button variant="outline" size="sm" disabled={busy} onClick={()=>response===null?void read():setResponse(null)}>{busy?'Checking response…':response===null?'Read submitted response':'Hide submitted response'}</Button>
    {error&&<p role="alert" className="mt-2 text-destructive">{error}</p>}
    {response!==null&&<section aria-label="Original submitted response" className="mt-2 rounded border bg-card p-3"><p className="mb-2 text-xs text-muted-foreground">Your original submission is read-only.</p><p className="whitespace-pre-wrap break-words text-sm">{response}</p></section>}
  </div>;
}
