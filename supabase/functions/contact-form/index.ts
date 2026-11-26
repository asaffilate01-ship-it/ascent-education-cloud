import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {processLegacyContact,readBoundedContactBody} from '../_shared/legacy-contact.ts';

const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...corsHeaders,'content-type':'application/json','cache-control':'no-store'}
});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),5,60000))return rateLimitResponse();
 const input=await readBoundedContactBody(req);
 if(!input.ok)return json({error:input.status===413?'Request too large':'Invalid request'},input.status);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json({error:'Admissions are temporarily unavailable.'},503);
 try{
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await processLegacyContact(input.value,{
   async resolveActiveTenant(slug){
    const {data,error}=await admin.from('tenants').select('id').eq('slug',slug).eq('status','active').maybeSingle();
    if(error)throw Error('Tenant lookup failed');
    return typeof data?.id==='string'?data.id:null;
   },
   async insertLead(lead){
    const {data,error}=await admin.from('applications').insert(lead).select('id').single();
    if(error)throw Error('Lead insert failed');
    return typeof data?.id==='string'?data.id:null;
   },
  },Deno.env.get('UNIPATHWAY_REQUIRE_SECURE_CONTACT')==='true');
  return json(result.body,result.status);
 }catch{
  return json({error:'Enquiries are temporarily unavailable.'},503);
 }
});
