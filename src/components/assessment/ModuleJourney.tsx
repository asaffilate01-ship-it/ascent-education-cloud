import {NavLink} from 'react-router-dom';
type Destination=readonly [label:string,path:string,kind?:string];
const flow:readonly Destination[]=[['My course','/student/module'],['Next lesson','/student/lessons'],['Submit work','/student/assignments'],['Read feedback','/student/grades']];
const resources:readonly Destination[]=[['Classes','/student/classroom'],['Resources','/student/library'],['Practical labs','/student/labs'],['Recordings','/student/library','recording'],['Learning plan','/student/learning-plan']];
const teaching:readonly Destination[]=[['Module','/lecturer/module'],['Lessons','/lecturer/lessons'],['Classes','/lecturer/classroom'],['Assignments','/lecturer/assessments']];
const teachingTools:readonly Destination[]=[['Learning plans','/lecturer/learning-plans'],['Materials','/lecturer/materials'],['Recordings','/lecturer/lesson-archive']];
export function moduleJourneyUrl(path:string,moduleId:string,kind?:string){const query=new URLSearchParams({module:moduleId});if(kind)query.set('kind',kind);return `${path}?${query}`;}
export default function ModuleJourney({moduleId,teacher=false}:{moduleId?:string;teacher?:boolean}){
 if(!moduleId)return null;
 const links=(items:readonly Destination[])=>items.map(([label,path,kind])=><NavLink key={label} to={moduleJourneyUrl(path,moduleId,kind)} className={({isActive})=>`inline-flex min-h-11 min-w-0 items-center rounded-lg px-2 py-2 text-sm [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive?'bg-primary/10 font-semibold text-primary':'text-muted-foreground hover:bg-accent'}`}>{label}</NavLink>);
 return <nav aria-label="Module learning journey" className="mt-3 min-w-0 space-y-1"><div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap"><NavLink className="inline-flex min-h-11 items-center px-3 text-sm underline" to={teacher?'/lecturer':'/student'}>{teacher?'Today’s teaching':'Today'}</NavLink>{links(teacher?teaching:flow)}</div><details className="mt-1"><summary className="min-h-11 cursor-pointer rounded-lg border px-3 py-3 text-sm text-muted-foreground">{teacher?'Preparation and resources':'Classes and resources'}</summary><div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap">{links(teacher?teachingTools:resources)}</div></details></nav>;
}
