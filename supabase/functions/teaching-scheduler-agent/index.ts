import {corsHeaders,getClientIp,rateLimit,rateLimitResponse} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {MAX_SCHEDULER_ROWS,parseSchedulingRequest,verifiedSchedulingManager,approvedCandidates,declaredAvailabilityFits,hasSchedulingConflict} from '../_shared/teaching-scheduler-policy.ts';

const headers={...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Authorization'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
type ReadResult={data:unknown;error:unknown;count:number|null};
function checkedRows(result:ReadResult){
 if(result.error||!Array.isArray(result.data)||result.count!==result.data.length||result.data.length>MAX_SCHEDULER_ROWS)throw Error('Incomplete scoped source');
 return result.data;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),10,60_000))return rateLimitResponse();
 try{
  const auth=await authenticateRequest(req);
  if(auth instanceof Response)return auth;
  if(auth.claims.is_anonymous===true||!auth.userId)return json({error:'Verified staff account required'},401);
  if(Deno.env.get('UNIPATHWAY_TEACHING_SCHEDULER_ENABLED')!=='true')return json({error:'Teaching scheduling advisory is not activated'},503);
  const raw=await req.text();
  if(raw.length>8192)return json({error:'Request too large'},413);
  let request;
  try{request=parseSchedulingRequest(JSON.parse(raw));}catch{return json({error:'Provide one to eight dated, 45- or 90-minute Pakistan-time slots and a module ID'},400);}
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false,autoRefreshToken:false}});
  const profile=await client.from('profiles').select('tenant_id').eq('user_id',auth.userId).single();
  if(profile.error||!profile.data?.tenant_id)return json({error:'Verified centre assignment required'},403);
  const tenant=profile.data.tenant_id as string;
  const membership=await client.from('user_roles').select('user_id,tenant_id,role',{count:'exact'}).eq('user_id',auth.userId).limit(MAX_SCHEDULER_ROWS+1);
  if(!verifiedSchedulingManager(checkedRows(membership),tenant,auth.userId))return json({error:'Centre management authorisation required'},403);
  const module=await client.from('modules').select('id,tenant_id').eq('id',request.moduleId).eq('tenant_id',tenant).maybeSingle();
  if(module.error||module.data?.tenant_id!==tenant||module.data.id!==request.moduleId)return json({error:'Authorised module not found'},404);
  const eligibility=checkedRows(await client.from('module_staff_eligibility').select('tenant_id,module_id,user_id,eligibility_score,approved_by,approved_at,active',{count:'exact'}).eq('tenant_id',tenant).eq('module_id',request.moduleId).eq('active',true).limit(MAX_SCHEDULER_ROWS+1));
  const ids=[...new Set(eligibility.map(r=>r.user_id).filter(v=>typeof v==='string'))];
  const response=(proposals:unknown[])=>json({schemaVersion:'2026-11-24-v1',mode:'deterministic-advisory',moduleId:request.moduleId,asOf:new Date().toISOString(),proposals,notice:'Independent slot alternatives from recorded module approvals, applicant-declared PKT availability and visible bookings only. Recheck current competencies, availability, future weeks, workload, room capacity, live provider bookings and human approval before publication. No assignments were created.'});
  if(!ids.length)return response([]);
  const roles=checkedRows(await client.from('user_roles').select('user_id,tenant_id,role',{count:'exact'}).eq('tenant_id',tenant).eq('role','lecturer').in('user_id',ids).limit(MAX_SCHEDULER_ROWS+1));
  const candidates=approvedCandidates(eligibility,roles,tenant,request.moduleId);
  if(!candidates.length)return response([]);
  const candidateIds=candidates.map(c=>c.userId);
  const [drafts,weekly,assignments]=await Promise.all([
   client.from('onboarding_application_drafts').select('tenant_id,user_id,kind,answers',{count:'exact'}).eq('tenant_id',tenant).eq('kind','lecturer').in('user_id',candidateIds).limit(MAX_SCHEDULER_ROWS+1),
   client.from('scheduled_lectures').select('tenant_id,module_id,lecturer_id,day_of_week,start_time,end_time,effective_from,effective_until,room,cohort_reference,is_active',{count:'exact'}).eq('tenant_id',tenant).eq('is_active',true).limit(MAX_SCHEDULER_ROWS+1),
   client.from('teaching_assignments').select('tenant_id,module_id,lecturer_id,starts_at,ends_at,cohort_reference,room_or_link,status',{count:'exact'}).eq('tenant_id',tenant).neq('status','cancelled').limit(MAX_SCHEDULER_ROWS+1)
  ]);
  const declared=new Map(checkedRows(drafts).filter(r=>r.tenant_id===tenant&&r.kind==='lecturer'&&candidateIds.includes(r.user_id)).map(r=>[r.user_id,r.answers]));
  const recurring=checkedRows(weekly),bookings=checkedRows(assignments);
  const proposals=request.requiredSlots.flatMap((slot,slotIndex)=>candidates
   .filter(c=>declaredAvailabilityFits(declared.get(c.userId),slot)&&!hasSchedulingConflict(recurring,bookings,tenant,c.userId,request.moduleId,request.cohortReference,slot))
   .slice(0,5).map(c=>({userId:c.userId,slotIndex,slot,score:c.score,reasons:['Recorded module eligibility','Declared availability matches this PKT slot','No overlapping visible booking found']})));
  return response(proposals);
 }catch{
  return json({error:'Scheduling sources could not be completely verified. Review permissions and activation before retrying.'},503);
 }
});
