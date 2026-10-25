import {useEffect,useRef,useState,type ReactNode} from 'react';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
export default function PlacementActionForm({action,label,children,payload,onSaved}:{action:string;label:string;children?:ReactNode;payload:(form:FormData)=>Record<string,unknown>;onSaved:()=>void}){
 const [pending,setPending]=useState<{p_request:string;p_action:string;p_data:Record<string,unknown>}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),running=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function send(form:HTMLFormElement){
  if(running.current)return;
  const request=pending||{p_request:crypto.randomUUID(),p_action:action,p_data:payload(new FormData(form))};
  running.current=true;setBusy(true);setPending(request);setError('');
  try{const r=await db.rpc('change_unipathway_placement',request);if(!alive.current)return;if(r.error||r.data!==request.p_request)throw Error('Unconfirmed');setPending(null);onSaved();}
  catch{if(alive.current)setError('Save could not be confirmed. Refresh placements to check the saved state, or retry these same details. The centre may need to review enrolment, employer verification or placement rules.');}
  finally{running.current=false;if(alive.current)setBusy(false);}
 }
 return <form className="my-3 space-y-3 rounded border p-4" onSubmit={e=>{e.preventDefault();void send(e.currentTarget);}}><fieldset disabled={busy||!!pending} className="space-y-3">{children}</fieldset><Button disabled={busy} type="submit">{busy?'Saving…':pending?'Retry same placement action':label}</Button>{error&&<p role="alert">{error}</p>}</form>;
}
