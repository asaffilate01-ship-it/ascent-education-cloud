export type ScheduleSlot = {id:string; tenant_id:string; lecturer_id:string; module_id:string; day_of_week:number; start_time:string; end_time:string; academic_year:string; semester:number; effective_from:string; effective_until:string|null; room:string|null; is_active:boolean};
export function scheduleConflicts(slots:ScheduleSlot[]) {
 const conflicts:{a:string;b:string;reasons:string[]}[]=[];
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
  const a=slots[i],b=slots[j];
  if(!a.is_active||!b.is_active||a.tenant_id!==b.tenant_id||a.academic_year!==b.academic_year||a.semester!==b.semester||a.day_of_week!==b.day_of_week)continue;
  if(a.start_time>=b.end_time||b.start_time>=a.end_time||(a.effective_until&&a.effective_until<b.effective_from)||(b.effective_until&&b.effective_until<a.effective_from))continue;
  const reasons=[];
  if(a.lecturer_id===b.lecturer_id)reasons.push('Same lecturer');
  if(a.room?.trim()&&a.room.trim().toLowerCase()!=='virtual'&&a.room.trim().toLowerCase()===b.room?.trim().toLowerCase())reasons.push('Same room');
  if(a.module_id===b.module_id)reasons.push('Same module');
  if(reasons.length)conflicts.push({a:a.id,b:b.id,reasons});
 }
 return conflicts;
}
