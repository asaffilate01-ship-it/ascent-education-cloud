export type TeachingGroup={name:string;task:string;members:string[]};
export type TeachingLearner={id:string;name:string};
export function arrangeTeachingGroups(roster:TeachingLearner[],size:number):TeachingGroup[]{
 if(!Number.isInteger(size)||size<1||size>20)throw new Error('Choose 1–20 learners per group');
 if(Math.ceil(roster.length/size)>50)throw new Error('A plan supports up to 50 groups. Increase the group size or split the class.');
 return Array.from({length:Math.ceil(roster.length/size)},(_,index)=>({name:`${size===1?'Tutor':size===2?'Pair':'Group'} ${index+1}`,task:'',members:roster.slice(index*size,(index+1)*size).map(p=>p.id)}));
}
export function isTeamsMeetingUrl(input:string|null):input is string{
 if(!input)return false;
 try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(
  u.hostname==='teams.microsoft.com'&&u.pathname.startsWith('/l/meetup-join/')||
  ['teams.microsoft.com','teams.cloud.microsoft'].includes(u.hostname)&&/^\/meet\/\d+\/?$/.test(u.pathname)
 );}catch{return false;}
}
export function teachingPlanText(groups:TeachingGroup[],roster:TeachingLearner[],instructions:string,duration:number){
 const names=new Map(roster.map(p=>[p.id,p.name]));
 return [`Teams teaching plan — apply assignments in Teams Rooms`,`Duration: ${duration} minutes`,instructions,
  ...groups.map(g=>`${g.name}: ${g.members.map(id=>names.get(id)||'Learner no longer eligible').join(', ')}\nTask: ${g.task||'Follow class instructions'}`)].join('\n\n');
}

export type TeachingPlan={can_manage:boolean;groups:TeachingGroup[];roster:TeachingLearner[];revision:number;instructions:string;duration_minutes:number};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identifier=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=128;
/** Validate the invitation-gated projection before accessing class metadata.
 * Learner projections never include another learner's membership or roster.
 * Stale teacher assignments are retained for removal, not silently reassigned.
 */
export function readTeachingPlan(raw:unknown,teacher:boolean):TeachingPlan{
 if(!object(raw)||typeof raw.can_manage!=='boolean'||(raw.can_manage&&!teacher)||!Array.isArray(raw.groups)||raw.groups.length>50||!Array.isArray(raw.roster)||raw.roster.length>1000||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0||typeof raw.instructions!=='string'||raw.instructions.length>4000||!Number.isInteger(raw.duration_minutes)||Number(raw.duration_minutes)<1||Number(raw.duration_minutes)>180)throw Error('Invalid teaching plan');
 if(!raw.can_manage&&raw.roster.length)throw Error('Unexpected learner roster');
 const roster:TeachingLearner[]=[],ids=new Set<string>();
 for(const row of raw.roster){
  if(!object(row)||!identifier(row.id)||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>300)throw Error('Invalid invited learner');
  ids.add(row.id);roster.push({id:row.id,name:row.name});
 }
 const groups:TeachingGroup[]=[],seen=new Set<string>(),names=new Set<string>();
 for(const g of raw.groups){
  if(!object(g)||typeof g.name!=='string'||!g.name.trim()||g.name.length>80||names.has(g.name.trim())||typeof g.task!=='string'||g.task.length>2000)throw Error('Invalid teaching group');
  names.add(g.name.trim());
  const members:string[]=[];
  if(raw.can_manage){
   if(!Array.isArray(g.members)||g.members.length<1||g.members.length>1000)throw Error('Invalid group members');
   for(const id of g.members){if(!identifier(id)||seen.has(id)||seen.size>=1000)throw Error('Duplicate or invalid learner assignment');seen.add(id);members.push(id);}
  }else if(g.members!==undefined)throw Error('Unexpected private group membership');
  groups.push({name:g.name,task:g.task,members});
 }
 return {can_manage:raw.can_manage,groups,roster,revision:Number(raw.revision),instructions:raw.instructions,duration_minutes:Number(raw.duration_minutes)};
}
export function teachingPlanIssue(groups:TeachingGroup[],roster:TeachingLearner[],instructions:string,duration:number):string{
 if(!Number.isInteger(duration)||duration<1||duration>180)return 'Choose an activity duration of 1–180 minutes.';
 if(instructions.length>4000||groups.length>50)return 'The plan exceeds the permitted instruction or group limits.';
 const eligible=new Set(roster.map(p=>p.id)),seen=new Set<string>(),names=new Set<string>();
 for(const g of groups){
  const name=g.name.trim();
  if(!name||name.length>80||names.has(name))return 'Give each group a unique name of up to 80 characters.';
  names.add(name);
  if(g.task.length>2000||!g.members.length||g.members.length>1000)return 'Every group needs an assigned learner and a valid task.';
  for(const id of g.members){
   if(!eligible.has(id))return 'Remove learners who are no longer eligible before saving.';
   if(seen.has(id)||seen.size>=1000)return 'Each learner may be assigned once; the plan supports up to 1,000 assignments.';
   seen.add(id);
  }
 }
 return '';
}
export function moveTeachingLearner(groups:TeachingGroup[],id:string,target:number):TeachingGroup[]{
 if(!Number.isInteger(target)||target< -1||target>=groups.length)return groups;
 const source=groups.findIndex(g=>g.members.includes(id));
 if(source===target)return groups;
 return groups.map((g,i)=>({...g,members:i===target?[...g.members.filter(m=>m!==id),id]:g.members.filter(m=>m!==id)})).filter(g=>g.members.length);
}
