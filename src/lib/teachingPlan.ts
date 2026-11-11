/** Scheduled plans use same-day start/end times; invalid intervals contribute no duration. */
export function teachingHours(rows:{start_time:string;end_time:string}[]){
 const minutes=(value:string)=>{if(!/^\d{2}:\d{2}(:\d{2})?$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;};
 return rows.reduce((sum,r)=>{const duration=minutes(r.end_time)-minutes(r.start_time);return sum+(Number.isFinite(duration)&&duration>0?duration/60:0);},0);
}

type Slot={day_of_week:number;start_time:string;end_time:string;effective_from:string;effective_until:string|null};
/** Conservative warning: recurrence patterns still need human review. */
export function planOverlaps(rows:Slot[]){
 let overlaps=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];
  if(a.day_of_week===b.day_of_week&&a.start_time<b.end_time&&b.start_time<a.end_time&&a.effective_from<=(b.effective_until||'9999-12-31')&&b.effective_from<=(a.effective_until||'9999-12-31'))overlaps++;
 }
 return overlaps;
}

/** Order-independent module search; only applied to an already-authorised module list. */
export function matchesTeachingModuleSearch(title: string, code: string | null | undefined, search: string) {
 const terms=search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const haystack=[title,code||''].join(' ').toLocaleLowerCase();
 return terms.every(term=>haystack.includes(term));
}
/** ISO weekday 1=Monday through 7=Sunday, using the centre's local date. */
export function pakistanTeachingDayOfWeek(at=new Date()): number {
 const day=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',weekday:'long'}).format(at);
 return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(day)+1;
}

/** Return the date at the centre, independent of the device's time zone. */
export function pakistanTeachingDate(at=new Date()):string {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
 const value=(name:string)=>parts.find(part=>part.type===name)?.value||'';
 return [value('year'),value('month'),value('day')].join('-');
}

/** Today-only weekly plan candidates; these are not confirmed Teams/classes/invitations. */
export function savedTeachingPlanForPakistanDate<T extends {id:string;module_id:string;is_active:boolean;day_of_week:number;start_time:string;end_time:string;effective_from:string;effective_until:string|null}>(
 slots:readonly T[],at=new Date(),
):T[] {
 const day=pakistanTeachingDayOfWeek(at),date=pakistanTeachingDate(at);
 const isDate=(value:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(value);
 return slots.filter(slot=>slot.is_active&&slot.day_of_week===day
   &&isDate(slot.effective_from)&&slot.effective_from<=date
   &&(!slot.effective_until||(isDate(slot.effective_until)&&slot.effective_until>=date))
   &&teachingHours([slot])>0)
  .sort((a,b)=>a.start_time.localeCompare(b.start_time)||a.module_id.localeCompare(b.module_id)||a.id.localeCompare(b.id));
}
