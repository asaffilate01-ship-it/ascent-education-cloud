import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync,readdirSync} from 'node:fs';
let checks=0;
let role='lecturer',configured=true,allowed=true,calls=[];
const env={SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'test',OMNIQORA_AI_URL:'https://omniqora.invalid/complete',OMNIQORA_AI_TOKEN:'x'.repeat(32),OMNIQORA_AI_TENANT_ID:'centre'};
const scoped={from(table){const query={select(){return this},eq(){return this},single:async()=>({data:{tenant_id:'centre'}}),then(resolve){resolve({data:[{role,tenant_id:'centre'}]})}};return query},rpc:async()=>({data:{allowed}})};
const source=readFileSync('supabase/functions/_shared/omniqora.ts','utf8').replace(/^import .*;$/gm,'');
const js=ts.transpile(source,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022});
const exports={};new Function('exports','createClient','authenticateRequest','tutorEndpoint','Deno','fetch',js)(exports,()=>scoped,async()=>({userId:'learner',claims:{}}),x=>x,{env:{get:key=>configured?env[key]:key.startsWith('OMNIQORA')?undefined:env[key]}},async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({reply:'Test response'}))});
const req=new Request('https://app.invalid',{headers:{Authorization:'Bearer test'}});
const input={body:JSON.stringify({model:'forbidden-provider',messages:[{role:'user',content:'Help'}]})};
configured=false;await assert.rejects(()=>exports.omniqoraCompletion(req,'ai-course-builder',input),e=>e.status===503);assert.equal(calls.length,0);checks++;
configured=true;role='student';await assert.rejects(()=>exports.omniqoraCompletion(req,'ai-course-builder',input),e=>e.status===403);assert.equal(calls.length,0);checks++;
role='lecturer';allowed=false;await assert.rejects(()=>exports.omniqoraCompletion(req,'ai-course-builder',input),e=>e.status===429);assert.equal(calls.length,0);checks++;
allowed=true;const result=await exports.omniqoraCompletion(req,'ai-course-builder',input);assert.equal((await result.json()).choices[0].message.content,'Test response');checks++;
const payload=JSON.parse(calls[0].init.body);assert.equal(payload.tenantId,'centre');assert.equal(payload.userId,'learner');assert.equal(payload.model,undefined);assert.equal(calls[0].init.redirect,'error');checks++;
for(const dir of readdirSync('supabase/functions',{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name!=='_shared')){
 try{const code=readFileSync(`supabase/functions/${dir.name}/index.ts`,'utf8');assert.ok(!/ai\.gateway\.lovable\.dev|api\.openai\.com|api\.anthropic\.com/.test(code),dir.name+' provider bypass');}catch(e){if(e.code!=='ENOENT')throw e;}
}checks++;
console.log(`Omniqora connector: ${checks} configuration, authorization, allowance, identity and provider-routing checks passed`);
