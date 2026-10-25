export type Lesson = {id:string;module_id:string;tenant_id:string;title:string;body:string;position:number;video_url:string|null;transcript:string;resource_url:string|null;status:'draft'|'published'|'archived';revision:number};
export type LessonProgress = {lesson_id:string;revision:number;position_seconds:number;completed:boolean;updated_at:string};
export function nextLesson(lessons:Lesson[], progress:LessonProgress[]) {
 const ordered=[...lessons].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
 const pending=ordered.filter(l=>!progress.some(p=>p.lesson_id===l.id&&p.revision===l.revision&&p.completed));
 const recent=[...progress].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).find(p=>pending.some(l=>l.id===p.lesson_id&&l.revision===p.revision));
 return pending.find(l=>l.id===recent?.lesson_id)||pending[0]||ordered[0];
}
export function lessonUrl(value:string) {
 if(!value.trim())return null;
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a secure HTTPS link without embedded credentials.');return url.href;
}
