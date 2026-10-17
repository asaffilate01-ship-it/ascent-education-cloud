import {useEffect,useRef,useState} from 'react';

/** Public client key only. The Turnstile secret must stay in the Edge Function. */
type WidgetState='loading'|'ready'|'unavailable'|'unconfigured';
type TurnstileAPI={
 render:(container:HTMLElement,options:{
  sitekey:string;action:string;
  callback:(token:string)=>void;
  'expired-callback':()=>void;
  'error-callback':()=>void;
 })=>string;
 remove:(id:string)=>void;
};
declare global {
 interface Window {turnstile?:TurnstileAPI;}
}
const SCRIPT='unipathway-turnstile-script';
function loadTurnstile():Promise<TurnstileAPI>{
 if(window.turnstile)return Promise.resolve(window.turnstile);
 return new Promise((resolve,reject)=>{
  let script=document.getElementById(SCRIPT) as HTMLScriptElement|null;
  const loaded=()=>{
   if(window.turnstile)resolve(window.turnstile);
   else reject(new Error('Turnstile API did not initialize'));
  };
  const failed=()=>reject(new Error('Security challenge could not load'));
  if(script){
   script.addEventListener('load',loaded,{once:true});
   script.addEventListener('error',failed,{once:true});
   if(window.turnstile)loaded();
  }else{
   script=document.createElement('script');
   script.id=SCRIPT;
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.async=true;script.defer=true;
   script.addEventListener('load',loaded,{once:true});
   script.addEventListener('error',failed,{once:true});
   document.head.appendChild(script);
  }
 });
}
export default function TurnstileChallenge({onToken,resetSignal}:{onToken:(token:string)=>void;resetSignal:number}){
 const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY as string|undefined;
 const target=useRef<HTMLDivElement>(null);
 const [status,setStatus]=useState<WidgetState>(siteKey?'loading':'unconfigured');
 useEffect(()=>{
  let active=true;
  onToken('');
  if(!siteKey){setStatus('unconfigured');return()=>{active=false;};}
  setStatus('loading');
  let widgetId:string|null=null;
  void loadTurnstile().then(api=>{
    if(!active||!target.current)return;
    widgetId=api.render(target.current,{
      sitekey:siteKey,action:'unipathway-enquiry',
      callback:(token)=>{if(active){onToken(token);setStatus('ready');}},
      'expired-callback':()=>{if(active){onToken('');setStatus('ready');}},
      'error-callback':()=>{if(active){onToken('');setStatus('unavailable');}}
    });
    setStatus('ready');
  }).catch(()=>{if(active){onToken('');setStatus('unavailable');}});
  return()=>{
   active=false;
   if(widgetId&&window.turnstile){
    try{window.turnstile.remove(widgetId);}catch{/* widget may already be detached */}
   }
  };
 },[siteKey,onToken,resetSignal]);
 return <div className="md:col-span-2 space-y-2" role="group" aria-label="Security verification">
   <p className="text-sm font-semibold">Security verification *</p>
   {siteKey&&<div ref={target} aria-label="Human verification challenge" className="min-h-16"/>}
   {status==='loading'&&<p role="status" className="text-xs text-muted-foreground">Preparing secure form verification…</p>}
   {status==='unconfigured'&&<p role="alert" className="text-sm text-destructive">
    Online enquiries are not available until UniPathway configures its security challenge. Please contact admissions through the published contact details.
   </p>}
   {status==='unavailable'&&<p role="alert" className="text-sm text-destructive">
    Verification could not be completed. Please reload this page or contact admissions.
   </p>}
 </div>;
}
