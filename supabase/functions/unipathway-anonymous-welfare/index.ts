// Anonymous, one-way student wellbeing intake. Source only: disabled by default.
// Project owner must deploy independently to the CORRECT UniPathway project,
// enable JWT-free invocation for this one function, configure Turnstile,
// dedicated centre routing and trained welfare review before accepting reports.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {rateLimit,getClientIp} from '../_shared/cors.ts';

const origin=Deno.env.get('UNIPATHWAY_PUBLIC_ORIGIN')||'https://unipathway.pk';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type',
 'Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const respond=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{
 status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
const categories=new Set(['mental_health','academic','personal','financial','bullying','accessibility','housing','other']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async request=>{
 if(request.headers.get('Origin')!==origin)return respond({error:'Origin not authorised'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return respond({error:'Method not allowed'},405);
 if(Deno.env.get('UNIPATHWAY_ANONYMOUS_WELFARE_ENABLED')!=='true')
  return respond({error:'Anonymous wellbeing intake has not been activated.'},503);
 // An IP-based transient safeguard supplements one-time Turnstile verification.
 // The IP address is not written to the welfare cases database.
 if(!rateLimit(getClientIp(request),5,60_000))return respond({error:'Too many requests'},429);
 const key=Deno.env.get('TURNSTILE_SECRET_KEY');
 const centre=Deno.env.get('UNIPATHWAY_WELFARE_CENTRE_ID');
 const url=Deno.env.get('SUPABASE_URL');
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key||!centre||!uuid.test(centre)||!url||!service)
  return respond({error:'Private welfare intake configuration is incomplete.'},503);
 let body:Record<string,unknown>;
 try{
  const raw=await request.text();
  if(raw.length>5500)return respond({error:'Request too large'},413);
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return respond({error:'Invalid request'},400);
  body=parsed;
 }catch{return respond({error:'Invalid request'},400);}
 if(Object.keys(body).some(x=>!['category','message','urgency','turnstileToken'].includes(x))||
  typeof body.category!=='string'||!categories.has(body.category)||
  typeof body.message!=='string'||body.message.trim().length<10||body.message.length>3000||
  typeof body.urgency!=='string'||!['routine','soon'].includes(body.urgency)||
  typeof body.turnstileToken!=='string'||body.turnstileToken.length>2048||body.turnstileToken.length<10)
  return respond({error:'Invalid request fields'},400);
 try{
  const challenge=new URLSearchParams({secret:key,response:body.turnstileToken});
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:challenge,signal:AbortSignal.timeout(8000),
  });
  const proof=await check.json().catch(()=>null);
  if(!check.ok||proof?.success!==true||proof.hostname!==new URL(origin).hostname)
   return respond({error:'Human verification failed. Please retry.'},403);
  // NEVER use user sessions or inferred auth.uid() on this path.
  // A verified service key inserts only an anonymous record, with NULL student_id.
  const db=createClient(url,service,{auth:{persistSession:false}});
  const verifiedCentre=await db.from('tenants').select('id,slug,status').eq('id',centre).single();
  if(verifiedCentre.error||verifiedCentre.data?.slug!=='unipathway'||verifiedCentre.data?.status!=='active')
   return respond({error:'The approved UniPathway centre is unavailable.'},503);
  const result=await db.from('unipathway_welfare_requests').insert({
   tenant_id:centre,student_id:null,anonymous:true,
   category:body.category,urgency:body.urgency,message:body.message.trim(),status:'new',
  }).select('id').single();
  if(result.error||!result.data?.id)return respond({error:'Delivery could not be confirmed.'},503);
  // Do not return case ID, student identity, private details or lookup token.
  return respond({status:'accepted'},202);
 }catch{return respond({error:'Delivery could not be confirmed.'},503);}
});
