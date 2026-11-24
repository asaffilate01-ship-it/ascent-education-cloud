import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {parseCardPayload,readCardLookup} from '@/lib/centreCards';
const enabled=import.meta.env.VITE_UNIPATHWAY_CENTRE_CARDS_ENABLED==='true';
export default function RegisterCardLookup({module,roster,disabled,onMatch,onClear}:{module:string;roster:readonly string[];disabled:boolean;onMatch:(student:string)=>void;onClear:()=>void}){
 const {user}=useAuth();
 const [reference,setReference]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const generation=useRef(0),lock=useRef(false);
 useEffect(()=>()=>{generation.current++;},[module,user?.id,user?.tenantId,user?.role]);
 if(!enabled||!user?.tenantId||user.role!=='lecturer'||!user.roles?.includes('lecturer'))return null;
 const tenant=user.tenantId,parsed=parseCardPayload(reference);
 async function lookup(){if(!parsed||disabled||lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');onClear();const token=++generation.current;
  try{const r=await db.rpc('lookup_unipathway_student_card',{p_module:module,p_reference:parsed});if(r.error)throw Error();
   const match=readCardLookup(r.data,tenant,module,parsed,roster);if(token!==generation.current)return;
   if(!match){setMessage('No eligible learner card matched this assigned module. Check the card or use the normal roster.');return;}
   onMatch(match.student_id);setMessage('Learner located in this register. Confirm their identity and explicitly choose the attendance mark.');
  }catch{if(token===generation.current)setError('Card lookup could not be verified. No learner selected and no attendance mark saved.');}
  finally{lock.current=false;if(token===generation.current)setBusy(false);}
 }
 return <div className="space-y-2 rounded-lg border bg-card p-3"><h3 className="font-semibold">Find learner by centre card</h3><p className="text-xs text-muted-foreground">Use a compatible QR scanner that enters text, or type the reference from the learner’s card. Scanning does not record attendance.</p><div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm font-medium">QR card reference<input className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base" value={reference} maxLength={80} disabled={busy||disabled} onChange={e=>{setReference(e.target.value);setMessage('');setError('');onClear();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void lookup();}}}/></label><Button type="button" variant="outline" disabled={busy||disabled||!parsed} onClick={()=>void lookup()}>Find card holder</Button><Button type="button" variant="outline" disabled={busy||disabled} onClick={()=>{generation.current++;setReference('');setMessage('');setError('');onClear();}}>Clear card lookup</Button></div>{busy&&<p role="status">Checking card…</p>}{message&&<p role="status" className="text-sm">{message}</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
