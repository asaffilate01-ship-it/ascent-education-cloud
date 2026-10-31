/** Promptfoo adapter exercising the existing authenticated study-assistant endpoint. */
export default class UniPathwayProvider {
 id(){return 'unipathway:authenticated-study-assistant'}
 async callApi(prompt){
  const endpoint=process.env.UNIPATHWAY_EVAL_URL,token=process.env.UNIPATHWAY_EVAL_USER_TOKEN,allowed=process.env.UNIPATHWAY_EVAL_ALLOWED_ORIGIN;
  if(!endpoint||!token||!allowed)return {error:'Set UNIPATHWAY_EVAL_URL, exact UNIPATHWAY_EVAL_ALLOWED_ORIGIN and a staging learner UNIPATHWAY_EVAL_USER_TOKEN. Never supply production credentials or real student evidence.'};
  let url,allow;try{url=new URL(endpoint);allow=new URL(allowed)}catch{return {error:'Invalid evaluation endpoint or allowed origin'}}
  // Do not send a bearer token to an unexpected HTTPS host or a lookalike path.
  if(allow.protocol!=='https:'||allow.username||allow.password||allow.search||allow.hash||allow.pathname!=='/'||url.origin!==allow.origin)
   return {error:'Evaluation endpoint must match the approved staging HTTPS origin'};
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/functions/v1/ai-study-assistant')
   return {error:'Use the exact HTTPS study-assistant Edge Function route without URL credentials'};
  try{
   const res=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({question:prompt,conversationHistory:[]})});
   if(!res.ok)return {error:`Study assistant returned HTTP ${res.status}; evaluation failed`};
   const body=await res.json();if(typeof body.answer!=='string'||!body.answer.trim())return {error:'Study assistant returned no answer'};
   return {output:body.answer};
  }catch{return {error:'Evaluation request failed; check staging connection'}}
 }
}
