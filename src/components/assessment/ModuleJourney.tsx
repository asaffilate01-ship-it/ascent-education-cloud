import {Link} from 'react-router-dom';
const destinations=[['Classes','/student/classroom'],['Materials','/student/library'],['Recordings','/student/library','recording'],['Assignments','/student/assignments'],['Results','/student/grades']] as const;
export function moduleJourneyUrl(path:string,moduleId:string,kind?:string){const query=new URLSearchParams({module:moduleId});if(kind)query.set('kind',kind);return `${path}?${query}`;}
export default function ModuleJourney({moduleId}:{moduleId?:string}){
 if(!moduleId)return null;
 return <nav aria-label="Module learning journey" className="my-4 flex flex-wrap gap-3 rounded-lg border p-3"><Link className="text-sm underline" to="/student/courses">All my courses</Link>{destinations.map(([label,path,kind])=><Link key={label} className="text-sm font-semibold underline" to={moduleJourneyUrl(path,moduleId,kind)}>{label}</Link>)}</nav>;
}
