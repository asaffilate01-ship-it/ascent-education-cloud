// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import Provider from '../../evals/omniqora-provider.mjs';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
it('fails explicitly without a staging learner token',async()=>{vi.stubEnv('UNIPATHWAY_EVAL_URL','');vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','');expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error')});
it('does not send credentials to insecure or arbitrary routes',async()=>{vi.stubEnv('UNIPATHWAY_EVAL_URL','http://example.test/functions/v1/ai-study-assistant');vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error');expect(fetch).not.toHaveBeenCalled()});
it('treats provider failure as an evaluation error, not a passing answer',async()=>{vi.stubEnv('UNIPATHWAY_EVAL_URL','https://staging.example.test/functions/v1/ai-study-assistant');vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));const result=await new Provider().callApi('Synthetic question');expect(result).toHaveProperty('error');expect(result).not.toHaveProperty('output')});
it('uses the authenticated existing study endpoint and returns its answer',async()=>{vi.stubEnv('UNIPATHWAY_EVAL_URL','https://staging.example.test/functions/v1/ai-study-assistant');vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test');const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({answer:'A foundation degree is Level 5.'})));vi.stubGlobal('fetch',fetch);expect(await new Provider().callApi('Synthetic question')).toEqual({output:'A foundation degree is Level 5.'});expect(fetch.mock.calls[0][1].redirect).toBe('error');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({question:'Synthetic question',conversationHistory:[]})});

it('refuses a learner bearer token if an approved staging origin is not configured',async()=>{
 vi.stubEnv('UNIPATHWAY_EVAL_URL','https://staging.example.test/functions/v1/ai-study-assistant');
 vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');
 vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error');
 expect(fetch).not.toHaveBeenCalled();
});
it('refuses an unexpected HTTPS origin even when the endpoint path looks correct',async()=>{
 vi.stubEnv('UNIPATHWAY_EVAL_URL','https://malicious.example.test/functions/v1/ai-study-assistant');
 vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');
 vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error');
 expect(fetch).not.toHaveBeenCalled();
});
it('refuses a lookalike route and a malformed allowed origin',async()=>{
 vi.stubEnv('UNIPATHWAY_EVAL_URL','https://staging.example.test/malicious/functions/v1/ai-study-assistant');
 vi.stubEnv('UNIPATHWAY_EVAL_USER_TOKEN','synthetic');
 vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error');
 vi.stubEnv('UNIPATHWAY_EVAL_ALLOWED_ORIGIN','https://staging.example.test/incorrect-path');
 expect(await new Provider().callApi('Synthetic question')).toHaveProperty('error');
 expect(fetch).not.toHaveBeenCalled();
});
it('keeps a small offline regression catalogue for privacy, integrity and admissions claims',()=>{
 const config=JSON.parse(readFileSync(new URL('../../evals/promptfooconfig.json',import.meta.url),'utf8')) as {tests:{description:string}[]};
 const catalogue=config.tests.map(x=>x.description.toLowerCase()).join(' ');
 for(const requirement of ['privacy','prompt injection','assessed work','funding','cross-centre','unverified sources'])expect(catalogue).toContain(requirement);
});
