import {Link} from 'react-router-dom';
const destinations=[['Classes','/student/classroom'],['Materials','/student/library'],['Recordings','/student/library','recording'],['Assignments','/student/assignments'],['Results','/student/grades']] as const;
function moduleJourneyUrl(path:string,moduleId:string,kind?:string){const query=new URLSearchParams({module:moduleId});if(kind)query.set('kind',kind);return `${path}?${query}`;}
const teacherDestinations=[['Classes','/lecturer/classroom'],['Materials','/lecturer/materials'],['Recordings','/lecturer/lesson-archive'],['Assignments','/lecturer/assessments']] as const;
export default function ModuleJourney({moduleId,teacher=false}:{moduleId?:string;teacher?:boolean}){
 if(!moduleId)return null;
 return <nav aria-label="Module learning journey" className="my-4 flex flex-wrap gap-3 rounded-lg border p-3"><Link className="text-sm underline" to={teacher?'/lecturer':'/student/courses'}>{teacher?'All my teaching':'All my courses'}</Link>{(teacher?teacherDestinations:destinations).map(([label,path,kind])=><Link key={label} className="text-sm font-semibold underline" to={moduleJourneyUrl(path,moduleId,kind)}>{label}</Link>)}</nav>;
}
