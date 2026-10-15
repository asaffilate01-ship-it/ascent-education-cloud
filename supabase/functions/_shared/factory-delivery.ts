export interface FactoryEvent { id:string;tenant_id:string;event_type:string;source_id:string }
export interface FactoryConnection { tenantId:string;origin:string;tokenEnv:string;enabled:boolean }
export function factoryConnection(raw:string, tenant:string):FactoryConnection {
 const configs:FactoryConnection[]=JSON.parse(raw);
 if(!Array.isArray(configs)||configs.filter(c=>c.tenantId===tenant).length!==1)throw new Error('Factory connection unavailable');
 const config=configs.find(c=>c.tenantId===tenant)!;
 const url=new URL(config.origin);
 if(!config.enabled||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!/^OMNIQORA_BRIDGE_TOKEN_[A-Z0-9_]+$/.test(config.tokenEnv))throw new Error('Factory connection unavailable');
 return config;
}
export async function deliverFactoryEvent(event:FactoryEvent, config:FactoryConnection, token:string, transport:typeof fetch=fetch):Promise<string> {
 if(event.tenant_id!==config.tenantId||!config.enabled||token.length<32||/[\r\n]/.test(token))throw new Error('Invalid scoped credential');
 const metadata={tenantId:event.tenant_id,scopeId:event.tenant_id,eventType:event.event_type,recordId:event.source_id};
 const response=await transport(new URL('/api/integrations/events',config.origin),{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':event.id,'X-Event-Timestamp':String(Date.now())},
  body:JSON.stringify({title:`UniPathway ${event.event_type}`,input:JSON.stringify(metadata)}),
 });
 if(response.status!==202)throw new Error(`Factory HTTP ${response.status}`);
 const reader=response.body?.getReader();if(!reader)throw new Error('Missing Factory receipt');
 let raw='',size=0;const decoder=new TextDecoder();
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192)throw new Error('Invalid Factory receipt');raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{await reader.cancel();}
 const receipt=JSON.parse(raw);
 if(typeof receipt.runId!=='string'||!receipt.runId||receipt.runId.length>120||typeof receipt.status!=='string'||['failed','rejected','cancelled','error'].includes(receipt.status))throw new Error('Invalid Factory receipt');
 return receipt.runId;
}
