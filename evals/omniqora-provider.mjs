/** Promptfoo adapter exercising the existing authenticated study-assistant endpoint. */
export default class UniPathwayProvider {
 id(){return 'unipathway:authenticated-study-assistant'}
 async callApi(prompt){
  const endpoint=process.env.UNIPATHWAY_EVAL_URL,token=process.env.UNIPATHWAY_EVAL_USER_TOKEN;
  if(!endpoint||!token)return {error:'Set UNIPATHWAY_EVAL_URL and a staging learner UNIPATHWAY_EVAL_USER_TOKEN. No production credentials or student evidence.'};
  let url;try{url=new URL(endpoint)}catch{return {error:'Invalid evaluation endpoint'}}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/functions/v1/ai-study-assistant'))return {error:'Use the HTTPS study-assistant edge endpoint without URL credentials'};
  try{
   const res=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({question:prompt,conversationHistory:[]})});
   if(!res.ok)return {error:`Study assistant returned HTTP ${res.status}; evaluation failed`};
   const body=await res.json();if(typeof body.answer!=='string'||!body.answer.trim())return {error:'Study assistant returned no answer'};
   return {output:body.answer};
  }catch{return {error:'Evaluation request failed; check staging connection'}}
 }
}
