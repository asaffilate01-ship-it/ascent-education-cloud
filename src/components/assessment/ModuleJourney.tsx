import {NavLink} from 'react-router-dom';
type Destination=readonly [label:string,path:string,kind?:string];
const flow:readonly Destination[]=[['My course','/student/module'],['Next lesson','/student/lessons'],['Submit work','/student/assignments'],['Read feedback','/student/grades']];
const resources:readonly Destination[]=[['Classes','/student/classroom'],['Resources','/student/library'],['Recordings','/student/library','recording'],['Learning plan','/student/learning-plan']];
const teaching:readonly Destination[]=[['Module','/lecturer/module'],['Lessons','/lecturer/lessons'],['Classes','/lecturer/classroom'],['Assignments','/lecturer/assessments']];
const teachingTools:readonly Destination[]=[['Learning plans','/lecturer/learning-plans'],['Materials','/lecturer/materials'],['Recordings','/lecturer/lesson-archive']];
export function moduleJourneyUrl(path:string,moduleId:string,kind?:string){const query=new URLSearchParams({module:moduleId});if(kind)query.set('kind',kind);return `${path}?${query}`;}
export default function ModuleJourney({moduleId,teacher=false}:{moduleId?:string;teacher?:boolean}){
 if(!moduleId)return null;
 const links=(items:readonly Destination[])=>items.map(([label,path,kind])=><NavLink key={label} to={moduleJourneyUrl(path,moduleId,kind)} className={({isActive})=>`inline-flex min-h-11 items-center rounded-lg px-3 text-sm ${isActive?'bg-primary/10 font-semibold text-primary':'text-muted-foreground hover:bg-accent'}`}>{label}</NavLink>);
 return <nav aria-label="Module learning journey" className="my-4 border-b pb-3"><div className="flex flex-wrap items-center gap-1"><NavLink className="inline-flex min-h-11 items-center px-3 text-sm underline" to={teacher?'/lecturer':'/student'}>{teacher?'Today’s teaching':'Today'}</NavLink>{links(teacher?teaching:flow)}</div><details className="mt-1"><summary className="min-h-11 cursor-pointer px-3 py-3 text-sm text-muted-foreground">{teacher?'Preparation and resources':'Classes and resources'}</summary><div className="flex flex-wrap gap-1">{links(teacher?teachingTools:resources)}</div></details></nav>;
}
