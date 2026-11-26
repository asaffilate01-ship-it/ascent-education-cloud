import {validateDeadline,deadlineKinds,type DeadlineKind,type DeadlineRecord} from './scholarshipResearch';

export type StudentPlan=DeadlineRecord&{tenant_id:string;owner_id:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function verifyStudentPlans(raw:unknown,tenant:string,owner:string):StudentPlan[]{
 if(!tenant||!owner||!Array.isArray(raw)||raw.length>500)throw Error('Unverified planning register');
 const ids=new Set<string>();
 return raw.map(value=>{
  if(!value||typeof value!=='object'||value.tenant_id!==tenant||value.owner_id!==owner||typeof value.id!=='string'||!uuid.test(value.id)||ids.has(value.id)||typeof value.title!=='string'||typeof value.planning_date!=='string'||typeof value.completed!=='boolean'||!deadlineKinds.includes(value.category))throw Error('Unverified planning record');
  const item=validateDeadline({title:value.title,kind:value.category as DeadlineKind,date:value.planning_date,source:''});
  if(!item||item.date<'1900-01-01'||item.date>'9999-12-31')throw Error('Invalid planning date');
  ids.add(value.id);
  return {...item,id:value.id,completed:value.completed,tenant_id:tenant,owner_id:owner};
 });
}
