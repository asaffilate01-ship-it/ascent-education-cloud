export type ModuleScope={module_id:string;programme_id:string;module_title:string;module_code:string|null;programme_title:string;level:string|null;awarding_body:string|null};
export type AllocationPerson={id:string;name:string};
export type AllocationReview={id:string;slot:number;subject:string;framework:string;maximum_level:string;reviewed_at:string};
export type AllocationReceipt={id:string;tenant_id:string;module_id:string;previous_lecturer:string|null;lecturer_id:string|null;review_id:string|null;module_scope:ModuleScope;recorded_by:string;recorded_at:string};
export type AllocationContext={tenant_id:string;module_id:string;current_lecturer:string|null;updated_at:string;module_scope:ModuleScope;people:AllocationPerson[];selected_lecturer:string|null;reviews:AllocationReview[];latest_decision:AllocationReceipt|null;decision_current:boolean;writes_enabled:boolean};
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const optionalId=(x:unknown):x is string|null=>x===null||id(x);
const text=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=4000;
const nullable=(x:unknown):x is string|null=>x===null||typeof x==='string'&&x.length<=4000;
const instant=(x:unknown):x is string=>typeof x==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
function scope(x:unknown,module:string):ModuleScope{
 if(!obj(x)||x.module_id!==module||!id(x.programme_id)||!text(x.module_title)||!nullable(x.module_code)||!text(x.programme_title)||!nullable(x.level)||!nullable(x.awarding_body))throw Error('Invalid module scope');
 return {module_id:module,programme_id:x.programme_id,module_title:x.module_title,module_code:x.module_code,programme_title:x.programme_title,level:x.level,awarding_body:x.awarding_body};
}
export function sameModuleScope(a:ModuleScope,b:ModuleScope){return Object.entries(a).every(([key,value])=>b[key as keyof ModuleScope]===value);}
export function readAllocationReceipt(raw:unknown,tenant:string,module:string,expected?:{id:string;lecturer:string|null;review:string|null;previous:string|null;scope:ModuleScope;actor:string}):AllocationReceipt{
 if(!obj(raw)||!id(raw.id)||raw.tenant_id!==tenant||raw.module_id!==module||!optionalId(raw.previous_lecturer)||!optionalId(raw.lecturer_id)||!optionalId(raw.review_id)||(raw.lecturer_id===null)!==(raw.review_id===null)||!id(raw.recorded_by)||raw.recorded_by===raw.lecturer_id||!instant(raw.recorded_at))throw Error('Invalid allocation receipt');
 const s=scope(raw.module_scope,module);
 if(expected&&(raw.id!==expected.id||raw.lecturer_id!==expected.lecturer||raw.review_id!==expected.review||raw.previous_lecturer!==expected.previous||raw.recorded_by!==expected.actor||!sameModuleScope(s,expected.scope)))throw Error('Mismatched allocation receipt');
 return {id:raw.id,tenant_id:tenant,module_id:module,previous_lecturer:raw.previous_lecturer,lecturer_id:raw.lecturer_id,review_id:raw.review_id,module_scope:s,recorded_by:raw.recorded_by,recorded_at:raw.recorded_at};
}
export function readAllocationContext(raw:unknown,tenant:string,module:string,selected:string|null,uid:string):AllocationContext{
 if(!obj(raw)||raw.tenant_id!==tenant||raw.module_id!==module||raw.selected_lecturer!==selected||!optionalId(raw.current_lecturer)||!instant(raw.updated_at)||typeof raw.decision_current!=='boolean'||typeof raw.writes_enabled!=='boolean'||!Array.isArray(raw.people)||raw.people.length>500||!Array.isArray(raw.reviews)||raw.reviews.length>20||(!selected&&raw.reviews.length))throw Error('Invalid allocation context');
 const s=scope(raw.module_scope,module);
 const people:AllocationPerson[]=[],reviews:AllocationReview[]=[],ids=new Set<string>(),reviewIds=new Set<string>(),slots=new Set<number>();
 for(const p of raw.people){if(!obj(p)||!id(p.id)||p.id===uid||!text(p.name)||ids.has(p.id))throw Error('Invalid lecturer roster');ids.add(p.id);people.push({id:p.id,name:p.name});}
 if(selected&&!ids.has(selected))throw Error('Invalid selected lecturer');
 for(const r of raw.reviews){if(!obj(r)||!id(r.id)||reviewIds.has(r.id)||typeof r.slot!=='number'||!Number.isInteger(r.slot)||r.slot<1||r.slot>20||slots.has(r.slot)||!text(r.subject)||!text(r.framework)||!text(r.maximum_level)||!instant(r.reviewed_at))throw Error('Invalid competency review');reviewIds.add(r.id);slots.add(r.slot);reviews.push({id:r.id,slot:r.slot,subject:r.subject,framework:r.framework,maximum_level:r.maximum_level,reviewed_at:r.reviewed_at});}
 const d=raw.latest_decision===null?null:readAllocationReceipt(raw.latest_decision,tenant,module);
 if(raw.decision_current&&(!d||d.lecturer_id!==raw.current_lecturer||!sameModuleScope(d.module_scope,s)))throw Error('Inconsistent allocation decision');
 return {tenant_id:tenant,module_id:module,current_lecturer:raw.current_lecturer,updated_at:raw.updated_at,module_scope:s,people,selected_lecturer:selected,reviews,latest_decision:d,decision_current:raw.decision_current,writes_enabled:raw.writes_enabled};
}
