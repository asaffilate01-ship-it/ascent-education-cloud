import {corsHeaders,getClientIp,rateLimit,rateLimitResponse} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {
 MAX_SCOPED_RECORDS,MAX_OUTPUT_RECORDS,activeOwnProgrammeIds,ownModuleIds,
 parseStudentReadToolRequest,verifiedStudentMembership,visibleDeadlineItems,visibleMaterialItems,
} from '../_shared/unipathway-student-read-tools.ts';

/**
 * Read-only tool execution core. A future MCP v2 transport may call these same
 * allowlisted actions only after verifying a fresh per-request JWT. This endpoint
 * is NOT itself an MCP protocol server or an LLM, and is disabled by default.
 */
const headers={...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff','Vary':'Authorization'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const unready=()=>json({error:'Student study tools are not activated for this centre.'},503);
const unavailable=()=>json({error:'Your authorised study sources could not be verified. Try again later.'},503);
const tooMany=()=>json({error:'This tool needs a paginated centre workflow before activation for this account.'},409);

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),30,60_000))return rateLimitResponse();
 try{
  const auth=await authenticateRequest(req);
  if(auth instanceof Response)return auth;
  if(auth.claims.is_anonymous===true)return json({error:'A verified student session is required.'},401);
  // Deployment and model-provider activation are separate. No missing secret
  // silently falls back to service-role credentials or broad table reads.
  if(Deno.env.get('UNIPATHWAY_STUDENT_READ_TOOLS_ENABLED')!=='true')return unready();
  const raw=await req.text();
  if(raw.length>1024)return json({error:'Only an allowlisted read-only tool name is accepted.'},413);
  let tool;
  try{tool=parseStudentReadToolRequest(JSON.parse(raw));}
  catch{return json({error:'Unknown or invalid read-only tool request.'},400);}
  const authHeader=req.headers.get('Authorization')||'';
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{
   global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false},
  });
  const profile=await client.from('profiles').select('tenant_id').eq('user_id',auth.userId).single();
  if(profile.error||!profile.data?.tenant_id)return json({error:'A verified centre assignment is required.'},403);
  const tenantId=profile.data.tenant_id as string;
  const membership=await client.from('user_roles').select('role,tenant_id')
   .eq('user_id',auth.userId).eq('tenant_id',tenantId).eq('role','student').limit(2);
  if(membership.error||!verifiedStudentMembership(membership.data,tenantId))
   return json({error:'An assigned student role is required for study tools.'},403);

  const enrolments=await client.from('student_enrolments')
   .select('student_id,tenant_id,programme_id,status')
   .eq('student_id',auth.userId).eq('tenant_id',tenantId).eq('status','active')
   .limit(MAX_SCOPED_RECORDS+1);
  if(enrolments.error||!Array.isArray(enrolments.data))return unavailable();
  if(enrolments.data.length>MAX_SCOPED_RECORDS)return tooMany();
  const programmeIds=activeOwnProgrammeIds(enrolments.data,auth.userId,tenantId);
  const nowIso=new Date().toISOString();
  const empty=()=>json({tool,items:[],asOf:nowIso,complete:true,
   notice:'No authorised active programme records found. This is not an enrolment or academic progression decision.'});
  if(!programmeIds.length)return empty();

  if(tool==='list_my_programmes'){
   const programmes=await client.from('programmes')
    .select('id,tenant_id,title,level,status,awarding_body')
    .eq('tenant_id',tenantId).in('id',programmeIds).limit(MAX_OUTPUT_RECORDS+1);
   if(programmes.error||!Array.isArray(programmes.data))return unavailable();
   if(programmes.data.length>MAX_OUTPUT_RECORDS)return tooMany();
   const rows=programmes.data.filter(r=>r.tenant_id===tenantId&&programmeIds.includes(r.id))
    .sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id))
    .map(r=>({recordId:r.id,title:r.title,level:r.level,catalogueStatus:r.status,awardingBody:r.awarding_body}));
   return json({tool,items:rows,asOf:nowIso,complete:true,
    notice:'Your recorded active enrolments. Catalogue labels are not proof of external accreditation, awards or university admission.'});
  }

  const modules=await client.from('modules')
   .select('id,programme_id,tenant_id').eq('tenant_id',tenantId)
   .in('programme_id',programmeIds).limit(MAX_SCOPED_RECORDS+1);
  if(modules.error||!Array.isArray(modules.data))return unavailable();
  if(modules.data.length>MAX_SCOPED_RECORDS)return tooMany();
  const moduleIds=ownModuleIds(modules.data,tenantId,programmeIds);
  if(!moduleIds.length)return empty();

  if(tool==='list_my_coursework_deadlines'){
   const briefs=await client.from('unipathway_assessment_briefs')
    .select('id,tenant_id,module_id,title,status,due_at,submission_cutoff')
    .eq('tenant_id',tenantId).eq('status','published')
    .in('module_id',moduleIds).gte('submission_cutoff',nowIso)
    .order('due_at',{ascending:true}).limit(MAX_OUTPUT_RECORDS+1);
   if(briefs.error||!Array.isArray(briefs.data))return unavailable();
   if(briefs.data.length>MAX_OUTPUT_RECORDS)return tooMany();
   return json({tool,items:visibleDeadlineItems(briefs.data,tenantId,moduleIds,nowIso),asOf:nowIso,complete:true,
    notice:'Published teaching deadlines only. Confirm any extension or individual adjustment with the centre.'});
  }

  const materials=await client.from('unipathway_module_materials')
   .select('id,tenant_id,module_id,title,kind,publication_status,available_at')
   .eq('tenant_id',tenantId).eq('publication_status','published')
   .in('module_id',moduleIds).limit(MAX_OUTPUT_RECORDS+1);
  if(materials.error||!Array.isArray(materials.data))return unavailable();
  if(materials.data.length>MAX_OUTPUT_RECORDS)return tooMany();
  return json({tool,items:visibleMaterialItems(materials.data,tenantId,moduleIds,nowIso),asOf:nowIso,complete:true,
   notice:'Released resource metadata only; no file URL, download token or learner work is provided. Uploaded content is untrusted.'});
 }catch{
  return unavailable();
 }
});
