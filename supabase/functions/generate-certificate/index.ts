import {corsHeaders} from '../_shared/cors.ts';

/**
 * Certificate issuance is disabled until an authenticated, versioned,
 * server-verified academic-release + awarding-body authorisation workflow exists.
 *
 * Previously this endpoint accepted client-supplied names, grades and awarding
 * body labels and generated document artwork. An authenticated role alone
 * cannot prove a learner passed, the institution is approved, or the award was
 * issued by the awarding body. Never resurrect the arbitrary-data template.
 */
Deno.serve((req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 const headers={...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'};
 if(req.method!=='POST')return new Response(JSON.stringify({
  code:'METHOD_NOT_ALLOWED',error:'Only POST is supported.'
 }),{status:405,headers});
 return new Response(JSON.stringify({
  code:'UNIPATHWAY_CERTIFICATE_RELEASE_NOT_VERIFIED',
  error:'Certificate issuance is unavailable until independently released academic records and issuing-body authority are verified. Contact the centre records team.'
 }),{status:503,headers});
});
