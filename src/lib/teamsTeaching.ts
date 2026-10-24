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
