import {parseAcademicInstant} from '@/lib/academicTime';

export type Lesson = {id:string;module_id:string;tenant_id:string;title:string;body:string;position:number;video_url:string|null;transcript:string;resource_url:string|null;status:'draft'|'published'|'archived';revision:number};
export type LessonProgress = {lesson_id:string;revision:number;position_seconds:number;completed:boolean;updated_at:string};
export function nextLesson(lessons:Lesson[], progress:LessonProgress[]) {
 const ordered=[...lessons].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
 // Offline packs may contain older ISO date-only progress. Keep those at
 // UTC midnight for compatibility, but never promote malformed timestamps.
 const verified=progress.map(item=>({item,time:parseAcademicInstant(item.updated_at)}))
  .filter((entry):entry is {item:LessonProgress;time:number}=>entry.time!==null);
 const pending=ordered.filter(l=>!verified.some(({item:p})=>p.lesson_id===l.id&&p.revision===l.revision&&p.completed));
 const recent=[...verified].sort((a,b)=>b.time-a.time||a.item.lesson_id.localeCompare(b.item.lesson_id))
  .find(({item:p})=>pending.some(l=>l.id===p.lesson_id&&l.revision===p.revision))?.item;
 return pending.find(l=>l.id===recent?.lesson_id)||pending[0]||ordered[0];
}
export function lessonUrl(value:string) {
 if(!value.trim())return null;
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a secure HTTPS link without embedded credentials.');return url.href;
}
