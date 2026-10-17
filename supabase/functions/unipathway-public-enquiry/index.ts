import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getClientIp, rateLimit, rateLimitResponse } from '../_shared/cors.ts';

// Dedicated public enquiry endpoint for UniPathway. No student records are returned.
// In-memory throttling is a first defence; add a distributed quota + anti-bot check before launch.
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}
});
const destinations=['UK','USA','Canada','Australia','Germany','Pakistan'];
const testTypes=['academic','general','unsure'];
const origins=['current_student','external_student'];
const priorities=['OTHM','Qualifi','Direct entry','Unsure'];
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),4,60_000))return rateLimitResponse();
 let body:Record<string,unknown>;
 try{const parsed=await req.json();if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return json({error:'Invalid request'},400);body=parsed;}
 catch{return json({error:'Invalid JSON request'},400);}
 const kind=body.kind==='ielts'?'ielts':body.kind==='university'?'university':null;
 if(!kind||body.tenant_slug!=='unipathway')return json({error:'Unsupported enquiry'},400);
 const name=text(body.name,200),email=text(body.email,254),phone=text(body.phone,35),
   message=text(body.message,1800),destination=text(body.destination,25),
   testType=text(body.test_type,25),origin=text(body.student_origin,30),
   priority=text(body.prior_qualification,30);
 if(name.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || message.length>1800 || body.consent!==true || (phone&&phone.length<7)){
   return json({error:'Check your name, email, contact details and privacy acknowledgement.'},400);
 }
 if(!origins.includes(origin)|| (kind==='university'&&!destinations.includes(destination))
    || (kind==='ielts'&&!testTypes.includes(testType))
    || (kind==='university'&&!priorities.includes(priority))){
   return json({error:'Please choose a valid study route.'},400);
 }
 try{
   const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   if(!url||!secret)return json({error:'Enquiries are temporarily unavailable.'},503);
   const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const t=await admin.from('tenants').select('id').eq('slug','unipathway').maybeSingle();
   if(t.error||!t.data?.id)return json({error:'Admissions are temporarily unavailable; please try again later.'},503);
   const classification=kind==='ielts'?'IELTS '+testType:'University '+destination+' / '+priority;
   const notes=[
     'UniPathway independent admissions interest',
     'Route: '+(kind==='ielts'?'IELTS preparation':'University progression'),
     'Existing UniPathway student: '+(origin==='current_student'?'yes (not identity-verified)':'no'),
     kind==='ielts'?'Requested test: '+testType:'Destination: '+destination,
     kind==='university'?'Qualification interest: '+priority:'',
     'Applicant message: '+(message||'No additional message supplied'),
     'Privacy notice acknowledged: yes'
   ].filter(Boolean).join('\n').slice(0,4500);
   const created=await admin.from('applications').insert({
     tenant_id:t.data.id,
     student_name:name,email,phone:phone||null,
     source:kind==='ielts'?'ielts_preparation':'university_progression',
     stage:'lead',
     programme_name:classification,
     notes
   });
   if(created.error){
     console.error('UniPathway public enquiry insert failed:',created.error.code);
     return json({error:'Your enquiry could not be recorded. Please retry later.'},503);
   }
   return json({ok:true,message:'Enquiry received. Our admissions team can review it.'});
 }catch(e){
   console.error('UniPathway public enquiry failure',e instanceof Error?e.name:'unknown');
   return json({error:'The enquiry service is temporarily unavailable.'},503);
 }
});
