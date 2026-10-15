// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {factoryConnection,deliverFactoryEvent} from '../../supabase/functions/_shared/factory-delivery';
const tenant='10000000-0000-0000-0000-000000000001';
const config={tenantId:tenant,origin:'https://factory.example.org',tokenEnv:'OMNIQORA_BRIDGE_TOKEN_CENTRE',enabled:true};
const event={id:'event-1',tenant_id:tenant,event_type:'lab.completed',source_id:'source-1'};
describe('Factory event contract',()=>{
 it('sends only scoped notification metadata with a stable idempotency key',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify({runId:'run-1',status:'queued'}),{status:202}));
  expect(await deliverFactoryEvent(event,config,'x'.repeat(32),transport)).toBe('run-1');
  const [url,init]=transport.mock.calls[0] as unknown as [URL,RequestInit];
  expect(url.pathname).toBe('/api/integrations/events');expect(init.redirect).toBe('error');
  expect((init.headers as Record<string,string>)['Idempotency-Key']).toBe(event.id);
  const body=JSON.parse(init.body as string);expect(JSON.parse(body.input)).toEqual({tenantId:tenant,scopeId:tenant,eventType:'lab.completed',recordId:'source-1'});
 });
 it('refuses cross-tenant sending before any network call',async()=>{
  const transport=vi.fn();await expect(deliverFactoryEvent({...event,tenant_id:'other'},config,'x'.repeat(32),transport)).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
 });
 it('does not treat an HTTP error or failed receipt as delivery',async()=>{
  await expect(deliverFactoryEvent(event,config,'x'.repeat(32),async()=>new Response('{}',{status:403}))).rejects.toThrow();
  await expect(deliverFactoryEvent(event,config,'x'.repeat(32),async()=>new Response('{"runId":"bad","status":"failed"}',{status:202}))).rejects.toThrow();
 });
 it('rejects disabled, duplicate and non-HTTPS configuration',()=>{
  for(const configs of [[{...config,enabled:false}],[config,config],[{...config,origin:'http://factory.example.org'}]])expect(()=>factoryConnection(JSON.stringify(configs),tenant)).toThrow();
  expect(factoryConnection(JSON.stringify([config]),tenant)).toEqual(config);
 });
});
